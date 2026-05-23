"""Per-user plan + monthly usage persistence."""
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.db import connect
from app.core.plans import DEFAULT_PLAN_ID, Plan, get_plan


@dataclass
class Usage:
    tokens_used: int
    generations: int


def current_period() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


async def get_user_plan(user_id: str) -> Plan:
    async with connect() as db:
        cursor = await db.execute(
            "SELECT plan_id FROM user_plans WHERE user_id = ?", (user_id,)
        )
        row = await cursor.fetchone()
        plan_id = row["plan_id"] if row else DEFAULT_PLAN_ID
        return get_plan(plan_id)


async def set_user_plan(user_id: str, plan_id: str) -> None:
    async with connect() as db:
        await db.execute(
            """
            INSERT INTO user_plans (user_id, plan_id, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(user_id) DO UPDATE SET plan_id = excluded.plan_id, updated_at = datetime('now')
            """,
            (user_id, plan_id),
        )
        await db.commit()


async def get_usage(user_id: str, period: str | None = None) -> Usage:
    p = period or current_period()
    async with connect() as db:
        cursor = await db.execute(
            "SELECT tokens_used, generations FROM monthly_usage WHERE user_id = ? AND period = ?",
            (user_id, p),
        )
        row = await cursor.fetchone()
        if row is None:
            return Usage(tokens_used=0, generations=0)
        return Usage(tokens_used=row["tokens_used"], generations=row["generations"])


async def record_usage(user_id: str, tokens: int, generations: int = 1) -> None:
    p = current_period()
    async with connect() as db:
        await db.execute(
            """
            INSERT INTO monthly_usage (user_id, period, tokens_used, generations)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(user_id, period) DO UPDATE SET
                tokens_used = tokens_used + excluded.tokens_used,
                generations = generations + excluded.generations
            """,
            (user_id, p, tokens, generations),
        )
        await db.commit()
