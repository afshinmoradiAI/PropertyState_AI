"""Persistence for completed PropertyReports."""
from __future__ import annotations
import structlog
import uuid
from dataclasses import dataclass

from app.core.db import connect
from app.schemas.property import PropertyReport

logger = structlog.get_logger(__name__)


@dataclass
class ReportSummary:
    """Lightweight view of a saved report — used by the library list view."""
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


async def save_report(report: PropertyReport, user_id: str | None = None) -> str:
    """Save a completed report. Returns the new report id.

    `user_id` is optional — None means an anonymous report (still saved, still
    accessible via the shareable link, but won't show in any user's library).
    """
    report_id = uuid.uuid4().hex
    p = report.property
    ip = report.investment_potential

    async with connect() as db:
        await db.execute(
            """
            INSERT INTO reports (
                id, user_id, address, suburb, state, postcode, property_type,
                purchase_price, verdict, overall_score, tokens_used, report_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id, user_id,
                p.address, p.suburb, p.state, p.postcode, p.property_type,
                p.purchase_price,
                ip.verdict, ip.overall_score,
                report.tokens_used,
                report.model_dump_json(),
            ),
        )
        await db.commit()

    logger.info("report.saved", report_id=report_id, user_id=user_id, address=p.address, verdict=ip.verdict)
    return report_id


async def get_report(report_id: str) -> PropertyReport | None:
    """Reports are publicly viewable by id (shareable links). Library lists are user-scoped."""
    async with connect() as db:
        cursor = await db.execute(
            "SELECT report_json FROM reports WHERE id = ?",
            (report_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return PropertyReport.model_validate_json(row["report_json"])


async def get_report_owner(report_id: str) -> str | None:
    """Return the user_id that owns this report (None if anonymous or report missing)."""
    async with connect() as db:
        cursor = await db.execute(
            "SELECT user_id FROM reports WHERE id = ?", (report_id,)
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return row["user_id"]


async def list_reports(
    user_id: str | None,
    limit: int = 50,
    offset: int = 0,
) -> list[ReportSummary]:
    """List reports owned by `user_id`. If `user_id` is None, lists anonymous reports."""
    async with connect() as db:
        if user_id is None:
            cursor = await db.execute(
                """
                SELECT id, address, suburb, state, postcode, property_type,
                       purchase_price, verdict, overall_score, tokens_used, created_at
                FROM reports
                WHERE user_id IS NULL
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            )
        else:
            cursor = await db.execute(
                """
                SELECT id, address, suburb, state, postcode, property_type,
                       purchase_price, verdict, overall_score, tokens_used, created_at
                FROM reports
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                (user_id, limit, offset),
            )
        rows = await cursor.fetchall()
        return [ReportSummary(**dict(r)) for r in rows]


async def delete_report(report_id: str, user_id: str | None = None) -> bool:
    """Delete a report. If `user_id` is given, only deletes if owned by that user.
    Returns True if a row was deleted."""
    async with connect() as db:
        if user_id is None:
            cursor = await db.execute(
                "DELETE FROM reports WHERE id = ?", (report_id,)
            )
        else:
            cursor = await db.execute(
                "DELETE FROM reports WHERE id = ? AND user_id = ?",
                (report_id, user_id),
            )
        await db.commit()
        return cursor.rowcount > 0


async def count_reports(user_id: str | None) -> int:
    async with connect() as db:
        if user_id is None:
            cursor = await db.execute("SELECT COUNT(*) AS n FROM reports WHERE user_id IS NULL")
        else:
            cursor = await db.execute("SELECT COUNT(*) AS n FROM reports WHERE user_id = ?", (user_id,))
        row = await cursor.fetchone()
        return row["n"] if row else 0
