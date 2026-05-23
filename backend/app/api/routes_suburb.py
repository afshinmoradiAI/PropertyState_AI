from __future__ import annotations
import structlog

from fastapi import APIRouter, HTTPException

from app.agents.suburb_search_agent import SuburbSearchAgent
from app.schemas.suburb import SuburbSearchRequest, SuburbSearchResponse

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/suburb", tags=["suburb"])

_agent = SuburbSearchAgent()


@router.post("/search", response_model=SuburbSearchResponse)
async def search_suburb(body: SuburbSearchRequest) -> SuburbSearchResponse:
    """Run a buyer's-agent-style search on a suburb and return recommendations."""
    try:
        result, tokens = await _agent.run(body.query)
        return SuburbSearchResponse(result=result, tokens_used=tokens)
    except Exception as exc:
        logger.exception("Suburb search failed")
        raise HTTPException(
            status_code=500,
            detail={"type": "suburb_search_error", "title": str(exc)},
        ) from exc
