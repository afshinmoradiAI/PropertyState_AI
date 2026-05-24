from __future__ import annotations
import asyncio
import json
import structlog

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.core.auth import User, get_current_user_optional
from app.core.plan_gate import plan_gate
from app.services import plan_store

from app.core.base_agent import get_client
from app.core.config import settings
from app.core.orchestrator import PropertyAnalysisOrchestrator
from app.schemas.property import (
    AnalyzeRequest,
    AnalyzeResponse,
    ChatRequest,
    CompareRequest,
    CompareResponse,
)
from app.services import report_store

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/property", tags=["property"])

_orchestrator = PropertyAnalysisOrchestrator()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_property(
    body: AnalyzeRequest,
    user: User | None = Depends(plan_gate),
) -> AnalyzeResponse:
    """Run full analysis, persist it, and return the complete report + id."""
    try:
        report = await _orchestrator.analyze(body.property, body.selected_analyses)
        report_id = await report_store.save_report(report, user_id=user.id if user else None)
        if user:
            await plan_store.record_usage(user.id, tokens=report.tokens_used, generations=1)
        return AnalyzeResponse(report=report, report_id=report_id)
    except Exception as exc:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail={"type": "analysis_error", "title": str(exc)}) from exc


@router.post("/analyze/stream")
async def analyze_property_stream(
    body: AnalyzeRequest,
    user: User | None = Depends(plan_gate),
) -> StreamingResponse:
    """Stream results as each agent completes (Server-Sent Events)."""
    user_id = user.id if user else None

    async def event_generator():
        try:
            async for event in _orchestrator.analyze_stream(body.property, body.selected_analyses):
                payload = json.dumps({"event": event["event"], "data": event["data"]})
                yield f"data: {payload}\n\n"

                # On full completion, persist + record usage + emit a `saved` event with the id.
                if event["event"] == "complete":
                    from app.schemas.property import PropertyReport
                    report = PropertyReport.model_validate(event["data"])
                    report_id = await report_store.save_report(report, user_id=user_id)
                    if user_id:
                        await plan_store.record_usage(user_id, tokens=report.tokens_used, generations=1)
                    saved_payload = json.dumps({"event": "saved", "data": {"report_id": report_id}})
                    yield f"data: {saved_payload}\n\n"
        except Exception as exc:
            logger.exception("Streaming analysis failed")
            error_payload = json.dumps({"event": "error", "data": {"message": str(exc)}})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/compare", response_model=CompareResponse)
async def compare_properties(body: CompareRequest) -> CompareResponse:
    """Run a full analysis on 2-3 properties in parallel and return all reports."""
    try:
        reports = await asyncio.gather(
            *(_orchestrator.analyze(p) for p in body.properties)
        )
        return CompareResponse(reports=list(reports))
    except Exception as exc:
        logger.exception("Comparison failed")
        raise HTTPException(
            status_code=500,
            detail={"type": "comparison_error", "title": str(exc)},
        ) from exc


@router.post("/compare/stream")
async def compare_properties_stream(body: CompareRequest) -> StreamingResponse:
    """Stream comparison results — each event is tagged with the property index."""

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def run_one(index: int, prop):
            try:
                async for event in _orchestrator.analyze_stream(prop):
                    await queue.put({"index": index, **event})
            except Exception as exc:
                await queue.put({"index": index, "event": "error", "data": {"message": str(exc)}})

        tasks = [
            asyncio.create_task(run_one(i, p)) for i, p in enumerate(body.properties)
        ]

        async def signal_done():
            await asyncio.gather(*tasks, return_exceptions=True)
            await queue.put(None)

        done_task = asyncio.create_task(signal_done())

        try:
            while True:
                item = await queue.get()
                if item is None:
                    break
                payload = json.dumps(item)
                yield f"data: {payload}\n\n"
        finally:
            done_task.cancel()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


CHAT_SYSTEM_PROMPT = """You are a senior Australian property investment advisor. The user has just received a full AI-generated investment report on a specific property. The complete report (rental yield, cashflow, ROI, location risk, tax & depreciation, investment verdict, and negotiation strategy) is provided below as JSON context. Answer the user's follow-up questions using ONLY the numbers and context from this report — do not invent new metrics.

Guidelines:
- Be conversational, direct, and concise. Aim for 1-3 short paragraphs.
- When the user asks "what if" questions about different rent / price / interest rate, you can recompute simple maths yourself (weekly mortgage, gross yield, etc.) and clearly state your assumptions.
- When asked to explain a metric, give the plain-English meaning + the specific number from the report.
- If a question is outside the scope of the report (e.g. specific suburb that isn't this one, legal advice), say so plainly and steer back to what you can answer.
- Never recommend specific lenders, accountants, or product names.
- Always frame numbers as estimates. Disclaim that final figures depend on the user's own broker, accountant, and quantity surveyor.

REPORT JSON:
{report_json}
"""


@router.post("/chat/stream")
async def chat_with_report(body: ChatRequest) -> StreamingResponse:
    """Streaming chat — the report is injected as system context, history is replayed."""

    async def event_generator():
        try:
            client = get_client()
            system = CHAT_SYSTEM_PROMPT.format(report_json=body.report.model_dump_json())

            messages = [
                {"role": m.role, "content": m.content}
                for m in body.history
                if m.role in ("user", "assistant")
            ]
            messages.append({"role": "user", "content": body.message})

            async with client.messages.stream(
                model=settings.default_model,
                max_tokens=1024,
                system=system,
                messages=messages,
            ) as stream:
                async for text in stream.text_stream:
                    payload = json.dumps({"event": "chunk", "data": {"text": text}})
                    yield f"data: {payload}\n\n"

                final = await stream.get_final_message()
                tokens = final.usage.input_tokens + final.usage.output_tokens
                done = json.dumps({"event": "done", "data": {"tokens_used": tokens}})
                yield f"data: {done}\n\n"
        except Exception as exc:
            logger.exception("Chat streaming failed")
            err = json.dumps({"event": "error", "data": {"message": str(exc)}})
            yield f"data: {err}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
