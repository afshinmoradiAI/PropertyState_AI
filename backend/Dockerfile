# ── Stage 1: dependency resolver ─────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files only (cache-friendly layer)
COPY pyproject.toml uv.lock ./

# Install production deps into an isolated venv
RUN uv sync --frozen --no-dev --no-cache

# ── Stage 2: runtime image ────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Non-root user for security
RUN addgroup --system app && adduser --system --ingroup app app

# Copy virtualenv from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code and prompt files
COPY app/ ./app/

# Activate venv by prepending it to PATH
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
