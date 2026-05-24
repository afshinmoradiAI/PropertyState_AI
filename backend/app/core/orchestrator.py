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
from app.schemas.property import ANALYSIS_IDS, PropertyInput, PropertyReport

logger = structlog.get_logger(__name__)

# Dependency map: synthesising agents that need other agents' output.
# Keyed by the dependent agent → set of prerequisites that must also run.
ANALYSIS_DEPENDENCIES: dict[str, set[str]] = {
    "investment_potential": {"rental_yield", "cashflow", "roi", "location_risk"},
    "negotiation": {"cashflow", "roi", "location_risk"},
}

# Agents that run independently in the parallel batch (no dependencies on other agents).
PARALLEL_AGENTS = {"rental_yield", "cashflow", "roi", "location_risk", "tax_depreciation"}
SYNTHESIS_AGENTS = {"investment_potential", "negotiation"}


def _resolve_selection(selected: list[str] | None) -> set[str]:
    """Expand the user's selection to include required dependencies.

    None or empty → run everything (backward compatible).
    Otherwise → the listed agents plus any prerequisites.
    """
    if not selected:
        return set(ANALYSIS_IDS)
    resolved = {s for s in selected if s in ANALYSIS_IDS}
    for agent_id in list(resolved):
        resolved.update(ANALYSIS_DEPENDENCIES.get(agent_id, set()))
    return resolved


class PropertyAnalysisOrchestrator:
    def __init__(self) -> None:
        self.rental_yield_agent = RentalYieldAgent()
        self.cashflow_agent = CashflowAgent()
        self.roi_agent = ROIAgent()
        self.location_risk_agent = LocationRiskAgent()
        self.tax_depreciation_agent = TaxDepreciationAgent()
        self.investment_potential_agent = InvestmentPotentialAgent()
        self.negotiation_agent = NegotiationAgent()

    def _agent_coro(self, name: str, prop: PropertyInput, ctx: dict | None = None):
        """Return the coroutine for a given analysis name."""
        if name == "rental_yield":
            return self.rental_yield_agent.run(prop)
        if name == "cashflow":
            return self.cashflow_agent.run(prop)
        if name == "roi":
            return self.roi_agent.run(prop)
        if name == "location_risk":
            return self.location_risk_agent.run(prop)
        if name == "tax_depreciation":
            return self.tax_depreciation_agent.run(prop)
        if name == "investment_potential":
            return self.investment_potential_agent.run(
                prop, ctx["rental_yield"], ctx["cashflow"], ctx["roi"], ctx["location_risk"]
            )
        if name == "negotiation":
            return self.negotiation_agent.run(
                prop, ctx["cashflow"], ctx["roi"], ctx["location_risk"]
            )
        raise ValueError(f"unknown agent: {name}")

    async def analyze(
        self, prop: PropertyInput, selected: list[str] | None = None
    ) -> PropertyReport:
        resolved = _resolve_selection(selected)
        logger.info("orchestrator.analyze.start", address=prop.address, selected=sorted(resolved))

        parallel = [a for a in PARALLEL_AGENTS if a in resolved]
        synthesis = [a for a in SYNTHESIS_AGENTS if a in resolved]

        results: dict = {}
        tokens_total = 0

        if parallel:
            outputs = await asyncio.gather(*(self._agent_coro(n, prop) for n in parallel))
            for name, (result, tokens) in zip(parallel, outputs):
                results[name] = result
                tokens_total += tokens

        if synthesis:
            outputs = await asyncio.gather(
                *(self._agent_coro(n, prop, results) for n in synthesis)
            )
            for name, (result, tokens) in zip(synthesis, outputs):
                results[name] = result
                tokens_total += tokens

        logger.info("orchestrator.analyze.done", total_tokens=tokens_total)

        return PropertyReport(
            property=prop,
            rental_yield=results.get("rental_yield"),
            cashflow=results.get("cashflow"),
            roi=results.get("roi"),
            location_risk=results.get("location_risk"),
            tax_depreciation=results.get("tax_depreciation"),
            investment_potential=results.get("investment_potential"),
            negotiation=results.get("negotiation"),
            selected_analyses=sorted(resolved),
            tokens_used=tokens_total,
        )

    async def analyze_stream(
        self, prop: PropertyInput, selected: list[str] | None = None
    ) -> AsyncGenerator[dict, None]:
        """Yield partial results as each agent completes."""
        resolved = _resolve_selection(selected)
        logger.info("orchestrator.stream.start", address=prop.address, selected=sorted(resolved))

        parallel = [a for a in PARALLEL_AGENTS if a in resolved]
        synthesis = [a for a in SYNTHESIS_AGENTS if a in resolved]

        queue: asyncio.Queue[tuple[str, object, int] | None] = asyncio.Queue()

        async def run_agent(name: str):
            result, tokens = await self._agent_coro(name, prop)
            await queue.put((name, result, tokens))

        tasks = [asyncio.create_task(run_agent(name)) for name in parallel]
        done_signal = asyncio.create_task(_signal_done(tasks, queue))

        results: dict = {}
        tokens_total = 0
        remaining = len(tasks)

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

        # Synthesis agents — run in parallel after their dependencies are ready.
        if synthesis:
            outputs = await asyncio.gather(
                *(self._agent_coro(n, prop, results) for n in synthesis)
            )
            for name, (result, tokens) in zip(synthesis, outputs):
                results[name] = result
                tokens_total += tokens
                yield {"event": name, "data": result.model_dump()}

        report = PropertyReport(
            property=prop,
            rental_yield=results.get("rental_yield"),
            cashflow=results.get("cashflow"),
            roi=results.get("roi"),
            location_risk=results.get("location_risk"),
            tax_depreciation=results.get("tax_depreciation"),
            investment_potential=results.get("investment_potential"),
            negotiation=results.get("negotiation"),
            selected_analyses=sorted(resolved),
            tokens_used=tokens_total,
        )
        yield {"event": "complete", "data": report.model_dump()}
        logger.info("orchestrator.stream.done", total_tokens=tokens_total)


async def _signal_done(tasks: list, queue: asyncio.Queue) -> None:
    await asyncio.gather(*tasks, return_exceptions=True)
    await queue.put(None)
