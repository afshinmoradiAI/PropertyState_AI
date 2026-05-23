"""structlog configuration — JSON logs in prod, pretty console in dev."""
from __future__ import annotations
import logging
import sys

import structlog

from app.core.config import settings


def configure_logging() -> None:
    """Configure structlog + the stdlib root logger."""
    is_dev = settings.log_level.upper() == "DEBUG" or settings.env == "development"

    # Stdlib logger config (so libraries that use logging also go through formatter)
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=settings.log_level.upper(),
    )

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]

    if is_dev:
        renderer = structlog.dev.ConsoleRenderer(colors=True)
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=shared_processors + [renderer],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(settings.log_level.upper())
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )
