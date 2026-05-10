from __future__ import annotations
import asyncio
import logging
from collections.abc import AsyncGenerator

from app.agents.cashflow_agent import CashflowAgent
from app.agents.investment_potential_agent import InvestmentPotentialAgent
from app.agents.location_risk_agent import LocationRiskAgent
from app.agents.rental_yield_agent import RentalYieldAgent
from app.agents.roi_agent import ROIAgent
from app.schemas.property import PropertyInput, PropertyReport

logger = logging.getLogger(__name__)


class PropertyAnalysisOrchestrator:
    def __init__(self) -> None:
        self.rental_yield_agent = RentalYieldAgent()
        self.cashflow_agent = CashflowAgent()
        self.roi_agent = ROIAgent()
        self.location_risk_agent = LocationRiskAgent()
        self.investment_potential_agent = InvestmentPotentialAgent()

    async def analyze(self, prop: PropertyInput) -> PropertyReport:
        logger.info("Orchestrator: starting parallel analysis for %s", prop.address)

        (rental_yield, ry_tokens), (cashflow, cf_tokens), (roi, roi_tokens), (location_risk, lr_tokens) = (
            await asyncio.gather(
                self.rental_yield_agent.run(prop),
                self.cashflow_agent.run(prop),
                self.roi_agent.run(prop),
                self.location_risk_agent.run(prop),
            )
        )

        logger.info("Orchestrator: parallel agents done, running synthesis")
        investment_potential, ip_tokens = await self.investment_potential_agent.run(
            prop, rental_yield, cashflow, roi, location_risk
        )

        total_tokens = ry_tokens + cf_tokens + roi_tokens + lr_tokens + ip_tokens
        logger.info("Orchestrator: complete. Total tokens used: %d", total_tokens)

        return PropertyReport(
            property=prop,
            rental_yield=rental_yield,
            cashflow=cashflow,
            roi=roi,
            location_risk=location_risk,
            investment_potential=investment_potential,
            tokens_used=total_tokens,
        )

    async def analyze_stream(self, prop: PropertyInput) -> AsyncGenerator[dict, None]:
        """Yield partial results as each agent completes."""
        logger.info("Orchestrator: starting streaming analysis for %s", prop.address)
        queue: asyncio.Queue[tuple[str, object] | None] = asyncio.Queue()

        async def run_agent(name: str, coro):
            result, tokens = await coro
            await queue.put((name, result, tokens))

        tasks = [
            asyncio.create_task(run_agent("rental_yield", self.rental_yield_agent.run(prop))),
            asyncio.create_task(run_agent("cashflow", self.cashflow_agent.run(prop))),
            asyncio.create_task(run_agent("roi", self.roi_agent.run(prop))),
            asyncio.create_task(run_agent("location_risk", self.location_risk_agent.run(prop))),
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

        investment_potential, ip_tokens = await self.investment_potential_agent.run(
            prop,
            results["rental_yield"],
            results["cashflow"],
            results["roi"],
            results["location_risk"],
        )
        tokens_total += ip_tokens
        yield {"event": "investment_potential", "data": investment_potential.model_dump()}

        report = PropertyReport(
            property=prop,
            rental_yield=results["rental_yield"],
            cashflow=results["cashflow"],
            roi=results["roi"],
            location_risk=results["location_risk"],
            investment_potential=investment_potential,
            tokens_used=tokens_total,
        )
        yield {"event": "complete", "data": report.model_dump()}
        logger.info("Orchestrator: stream complete. Total tokens: %d", tokens_total)


async def _signal_done(tasks: list, queue: asyncio.Queue) -> None:
    await asyncio.gather(*tasks, return_exceptions=True)
    await queue.put(None)
