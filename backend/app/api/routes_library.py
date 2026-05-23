"""Read/list/delete saved property reports."""
from __future__ import annotations
import structlog
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import User, get_current_user, get_current_user_optional
from app.schemas.property import PropertyReport
from app.services import report_store

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/library", tags=["library"])


class ReportSummaryOut(BaseModel):
    id: str
    address: str
    suburb: str
    state: str
    postcode: str
    property_type: str
    purchase_price: float
    verdict: str | None
    overall_score: int | None
    tokens_used: int
    created_at: str


class LibraryListResponse(BaseModel):
    reports: list[ReportSummaryOut]
    total: int


class ReportDetailResponse(BaseModel):
    id: str
    report: PropertyReport


@router.get("", response_model=LibraryListResponse)
async def list_library(
    user: User = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> LibraryListResponse:
    """Authenticated user's library. Sign-in required."""
    items = await report_store.list_reports(user_id=user.id, limit=limit, offset=offset)
    total = await report_store.count_reports(user_id=user.id)
    return LibraryListResponse(
        reports=[ReportSummaryOut(**asdict(i)) for i in items],
        total=total,
    )


@router.get("/{report_id}", response_model=ReportDetailResponse)
async def get_library_report(report_id: str) -> ReportDetailResponse:
    """Public — anyone with the report id can view it (shareable links)."""
    report = await report_store.get_report(report_id)
    if report is None:
        raise HTTPException(
            status_code=404,
            detail={"type": "not_found", "title": f"Report {report_id} not found"},
        )
    return ReportDetailResponse(id=report_id, report=report)


@router.delete("/{report_id}", status_code=204)
async def delete_library_report(
    report_id: str,
    user: User = Depends(get_current_user),
) -> None:
    """Only the owner may delete a report. Anonymous reports cannot be deleted via this route."""
    deleted = await report_store.delete_report(report_id, user_id=user.id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"type": "not_found", "title": f"Report {report_id} not found or not owned by you"},
        )
    return None
