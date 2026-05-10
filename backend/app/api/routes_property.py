from __future__ import annotations
import json
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.core.orchestrator import PropertyAnalysisOrchestrator
from app.schemas.property import AnalyzeRequest, AnalyzeResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/property", tags=["property"])

_orchestrator = PropertyAnalysisOrchestrator()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_property(body: AnalyzeRequest) -> AnalyzeResponse:
    """Run full analysis and return the complete report."""
    try:
        report = await _orchestrator.analyze(body.property)
        return AnalyzeResponse(report=report)
    except Exception as exc:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail={"type": "analysis_error", "title": str(exc)}) from exc


@router.post("/analyze/stream")
async def analyze_property_stream(body: AnalyzeRequest) -> StreamingResponse:
    """Stream results as each agent completes (Server-Sent Events)."""

    async def event_generator():
        try:
            async for event in _orchestrator.analyze_stream(body.property):
                payload = json.dumps({"event": event["event"], "data": event["data"]})
                yield f"data: {payload}\n\n"
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
