"""Request-ID middleware — accept inbound X-Request-ID or generate one, bind to structlog context."""
from __future__ import annotations
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class RequestIdMiddleware(BaseHTTPMiddleware):
    HEADER = "x-request-id"

    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get(self.HEADER) or uuid.uuid4().hex[:16]
        # Bind for the duration of this request — every log line includes request_id
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=rid, path=request.url.path, method=request.method)
        response: Response = await call_next(request)
        response.headers[self.HEADER] = rid
        return response
