from __future__ import annotations
import asyncio
import structlog
from collections.abc import AsyncGenerator

from app.agents.cashflow_agent import CashflowAgent
from app.agents.investment_potential_agent import InvestmentPotentialAgent
from app.agents.location_risk_agent import LocationRiskAgent
from app.agents.negotiation_agent import NegotiationAgent
from app.agents.rental_yield_agent import RentalYieldAgent
from app.agents.roi_agent import ROIAgent
from app.agents.tax_depreciation_agent import TaxDepreciationAgent
from app.schemas.property import PropertyInput, PropertyReport

logger = structlog.get_logger(__name__)


class PropertyAnalysisOrchestrator:
    def __init__(self) -> None:
        self.rental_yield_agent = RentalYieldAgent()
        self.cashflow_agent = CashflowAgent()
        self.roi_agent = ROIAgent()
        self.location_risk_agent = LocationRiskAgent()
        self.tax_depreciation_agent = TaxDepreciationAgent()
        self.investment_potential_agent = InvestmentPotentialAgent()
        self.negotiation_agent = NegotiationAgent()

    async def analyze(self, prop: PropertyInput) -> PropertyReport:
        logger.info("orchestrator.analyze.start", address=prop.address)

        (
            (rental_yield, ry_tokens),
            (cashflow, cf_tokens),
            (roi, roi_tokens),
            (location_risk, lr_tokens),
            (tax_depreciation, td_tokens),
        ) = await asyncio.gather(
            self.rental_yield_agent.run(prop),
            self.cashflow_agent.run(prop),
            self.roi_agent.run(prop),
            self.location_risk_agent.run(prop),
            self.tax_depreciation_agent.run(prop),
        )

        logger.info("orchestrator.parallel_done")
        (investment_potential, ip_tokens), (negotiation, ng_tokens) = await asyncio.gather(
            self.investment_potential_agent.run(prop, rental_yield, cashflow, roi, location_risk),
            self.negotiation_agent.run(prop, cashflow, roi, location_risk),
        )

        total_tokens = ry_tokens + cf_tokens + roi_tokens + lr_tokens + td_tokens + ip_tokens + ng_tokens
        logger.info("orchestrator.analyze.done", total_tokens=total_tokens)

        return PropertyReport(
            property=prop,
            rental_yield=rental_yield,
            cashflow=cashflow,
            roi=roi,
            location_risk=location_risk,
            tax_depreciation=tax_depreciation,
            investment_potential=investment_potential,
            negotiation=negotiation,
            tokens_used=total_tokens,
        )

    async def analyze_stream(self, prop: PropertyInput) -> AsyncGenerator[dict, None]:
        """Yield partial results as each agent completes."""
        logger.info("orchestrator.stream.start", address=prop.address)
        queue: asyncio.Queue[tuple[str, object] | None] = asyncio.Queue()

        async def run_agent(name: str, coro):
            result, tokens = await coro
            await queue.put((name, result, tokens))

        tasks = [
            asyncio.create_task(run_agent("rental_yield", self.rental_yield_agent.run(prop))),
            asyncio.create_task(run_agent("cashflow", self.cashflow_agent.run(prop))),
            asyncio.create_task(run_agent("roi", self.roi_agent.run(prop))),
            asyncio.create_task(run_agent("location_risk", self.location_risk_agent.run(prop))),
            asyncio.create_task(run_agent("tax_depreciation", self.tax_depreciation_agent.run(prop))),
        ]

        results: dict = {}
        tokens_total = 0
        remaining = len(tasks)

        done_signal = asyncio.create_task(_signal_done(tasks, queue))

        while remaining > 0:
            item = await queue.get()
            if item is None:
                break
            name, result, tokens = item
            results[name] = result
            tokens_total += tokens
            remaining -= 1
            yield {"event": name, "data": result.model_dump()}

        done_signal.cancel()

        (investment_potential, ip_tokens), (negotiation, ng_tokens) = await asyncio.gather(
            self.investment_potential_agent.run(
                prop,
                results["rental_yield"],
                results["cashflow"],
                results["roi"],
                results["location_risk"],
            ),
            self.negotiation_agent.run(
                prop,
                results["cashflow"],
                results["roi"],
                results["location_risk"],
            ),
        )
        tokens_total += ip_tokens + ng_tokens
        yield {"event": "investment_potential", "data": investment_potential.model_dump()}
        yield {"event": "negotiation", "data": negotiation.model_dump()}

        report = PropertyReport(
            property=prop,
            rental_yield=results["rental_yield"],
            cashflow=results["cashflow"],
            roi=results["roi"],
            location_risk=results["location_risk"],
            tax_depreciation=results["tax_depreciation"],
            investment_potential=investment_potential,
            negotiation=negotiation,
            tokens_used=tokens_total,
        )
        yield {"event": "complete", "data": report.model_dump()}
        logger.info("orchestrator.stream.done", total_tokens=tokens_total)


async def _signal_done(tasks: list, queue: asyncio.Queue) -> None:
    await asyncio.gather(*tasks, return_exceptions=True)
    await queue.put(None)
