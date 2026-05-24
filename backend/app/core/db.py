"""SQLite connection + schema bootstrap.

Uses WAL mode and foreign keys. The schema is defined inline and applied on app startup
via `init_db()` — there's no migrations framework yet because we have one table.
When the schema grows, add a `schema_version` table and migration scripts.
"""
from __future__ import annotations
import structlog
from contextlib import asynccontextmanager
from pathlib import Path

import aiosqlite

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Tables first (no indexes referencing columns that might be missing on old DBs).
TABLES = """
CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
    id            TEXT PRIMARY KEY,
    user_id       TEXT,  -- NULL = anonymous (legacy / pre-auth reports)
    address       TEXT NOT NULL,
    suburb        TEXT NOT NULL,
    state         TEXT NOT NULL,
    postcode      TEXT NOT NULL,
    property_type TEXT NOT NULL,
    purchase_price REAL NOT NULL,
    verdict       TEXT,
    overall_score INTEGER,
    tokens_used   INTEGER NOT NULL DEFAULT 0,
    report_json   TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_plans (
    user_id   TEXT PRIMARY KEY,
    plan_id   TEXT NOT NULL DEFAULT 'free',
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS monthly_usage (
    user_id      TEXT NOT NULL,
    period       TEXT NOT NULL,  -- 'YYYY-MM'
    tokens_used  INTEGER NOT NULL DEFAULT 0,
    generations  INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, period),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
    token       TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    expires_at  TEXT NOT NULL,
    used        INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

# Indexes run AFTER migrations so they can reference newly-added columns.
INDEXES = """
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
"""

# Lightweight in-place migrations for installs created before columns existed.
MIGRATIONS = [
    "ALTER TABLE reports ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE",
]


async def init_db() -> None:
    """Create the data directory + DB file, apply schema, enable WAL + foreign keys.

    Order matters: tables → migrations → indexes. Indexes referencing migrated columns
    would fail if created before the migration runs on an old database.
    """
    data_dir = Path(settings.data_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    async with aiosqlite.connect(settings.db_path) as db:
        await db.execute("PRAGMA journal_mode = WAL")
        await db.execute("PRAGMA foreign_keys = ON")
        await db.executescript(TABLES)
        # Idempotent migrations — try each one, swallow "duplicate column" errors.
        for stmt in MIGRATIONS:
            try:
                await db.execute(stmt)
            except Exception:
                pass  # column already exists
        await db.executescript(INDEXES)
        await db.commit()
    logger.info("db.initialised", path=settings.db_path)


@asynccontextmanager
async def connect():
    """Async context manager for a single SQLite connection with row factory."""
    async with aiosqlite.connect(settings.db_path) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        yield db
