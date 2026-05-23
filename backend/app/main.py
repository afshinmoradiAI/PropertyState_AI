from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.api.routes_account import router as account_router
from app.api.routes_auth import router as auth_router
from app.api.routes_billing import router as billing_router
from app.api.routes_library import router as library_router
from app.api.routes_models import router as models_router
from app.api.routes_oauth import router as oauth_router
from app.api.routes_property import router as property_router
from app.api.routes_stripe import router as stripe_router
from app.api.routes_suburb import router as suburb_router
from app.core.config import settings
from app.core.db import init_db
from app.core.logging_setup import configure_logging
from app.core.middleware import RequestIdMiddleware

configure_logging()
logger = structlog.get_logger(__name__)

# Sentry — no-op if SENTRY_DSN is not set
if settings.sentry_dsn:
    import sentry_sdk
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        environment=settings.env,
        send_default_pii=False,  # never send PII without explicit opt-in
    )
    logger.info("sentry.enabled", env=settings.env)


# Rate limiter — applied to specific routes via decorator
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=(
        [f"{settings.rate_limit_per_minute}/minute"] if settings.rate_limit_per_minute > 0 else []
    ),
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    logger.info("app.startup", env=settings.env, model=settings.default_model)
    yield
    logger.info("app.shutdown")


app = FastAPI(title="PropertyState AI", version="1.1.0", lifespan=lifespan)
app.state.limiter = limiter

# Rate-limit-exceeded handler — RFC 7807 shape
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    response = JSONResponse(
        status_code=429,
        content={
            "detail": {
                "type": "rate_limited",
                "title": f"Rate limit exceeded: {exc.detail}",
            }
        },
    )
    return _rate_limit_exceeded_handler(request, exc) or response


# Middleware order: outer to inner. CORS first (browser preflight), then request-id.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["x-request-id"],
)
app.add_middleware(RequestIdMiddleware)
if settings.rate_limit_per_minute > 0:
    app.add_middleware(SlowAPIMiddleware)

app.include_router(account_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(models_router, prefix="/api")
app.include_router(oauth_router, prefix="/api")
app.include_router(property_router, prefix="/api")
app.include_router(stripe_router, prefix="/api")
app.include_router(suburb_router, prefix="/api")
app.include_router(library_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
