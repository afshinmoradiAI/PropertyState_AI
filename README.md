# PropertyState AI

AI-powered property investment analysis for the Australian market. Submit any property and five parallel Claude agents return a full report — rental yield, cashflow, ROI, location risk, and a clear **BUY / HOLD / AVOID** verdict — in real time via Server-Sent Events.

---

## Table of Contents

- [Architecture](#architecture)
- [Agent Pipeline](#agent-pipeline)
- [Project Structure](#project-structure)
- [Quick Start (Local)](#quick-start-local)
- [Docker](#docker)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Running Tests](#running-tests)
- [Frontend](#frontend)
- [Deployment](#deployment)

---

## Architecture

```
Browser (Next.js)
      │  POST /api/property/analyze/stream
      ▼
FastAPI backend
      │
      ▼
PropertyAnalysisOrchestrator
      │
      ├─── RentalYieldAgent  ──┐
      ├─── CashflowAgent     ──┤  asyncio.gather (parallel)
      ├─── ROIAgent          ──┤
      └─── LocationRiskAgent ──┘
                               │
                               ▼
                    InvestmentPotentialAgent (synthesis)
                               │
                               ▼
                      PropertyReport (SSE stream)
```

- The first four agents run **in parallel** via `asyncio.gather`.
- Results stream to the browser as each agent completes (SSE).
- The `InvestmentPotentialAgent` runs last, consuming all four results to produce the final verdict.

---

## Agent Pipeline

| Agent | Input | Output |
|---|---|---|
| `RentalYieldAgent` | Property details | Gross/net yield, vacancy rate, market rent assessment |
| `CashflowAgent` | Property details | Weekly income vs. expenses, positive/negative cashflow |
| `ROIAgent` | Property details | Capital growth, 5-year projected value & equity, payback period |
| `LocationRiskAgent` | Property details | Suburb score, flood/crime/vacancy risk, infrastructure score |
| `InvestmentPotentialAgent` | All four results above | BUY / HOLD / AVOID verdict, confidence, overall score, strengths & risks |

Each agent:
- Inherits from `BaseAgent`
- Loads its system prompt from `backend/app/prompts/<name>.md`
- Calls `claude-sonnet-4-6` via the Anthropic SDK
- Returns a typed Pydantic model and token count

---

## Project Structure

```
PropertyState_AI/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── cashflow_agent.py
│   │   │   ├── investment_potential_agent.py
│   │   │   ├── location_risk_agent.py
│   │   │   ├── rental_yield_agent.py
│   │   │   └── roi_agent.py
│   │   ├── api/
│   │   │   └── routes_property.py       # POST /api/property/analyze[/stream]
│   │   ├── core/
│   │   │   ├── base_agent.py            # BaseAgent ABC + Claude client
│   │   │   ├── config.py                # Pydantic settings
│   │   │   └── orchestrator.py          # Parallel dispatch + SSE streaming
│   │   ├── prompts/                     # System prompts (Markdown)
│   │   ├── schemas/
│   │   │   └── property.py              # All Pydantic I/O models
│   │   └── main.py                      # FastAPI app, CORS, router registration
│   ├── tests/
│   │   ├── test_agents/
│   │   │   └── test_rental_yield_agent.py
│   │   └── test_api/
│   │       └── test_property_routes.py
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── PropertyForm.tsx          # Input form
│   │   │   └── AnalysisResults.tsx       # Streaming results display
│   │   ├── types/
│   │   │   └── property.ts              # TypeScript types mirroring Pydantic schemas
│   │   ├── layout.tsx
│   │   └── page.tsx                     # Hero + analysis page
│   ├── next.config.ts
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml                   # Local dev (backend + frontend)
├── docker-compose.prod.yml              # Production
└── .env.prod.example
```

---

## Quick Start (Local)

### Prerequisites

- Python 3.12+
- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...

pip install uv        # if not already installed
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:8000  (already set in .env.example)

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker

```bash
# Copy and fill in the API key
cp backend/.env.example backend/.env
# Set ANTHROPIC_API_KEY in backend/.env

docker compose up --build
```

- Backend: [http://localhost:8000](http://localhost:8000)
- Frontend: [http://localhost:3000](http://localhost:3000)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | — | Your Anthropic API key |
| `DEFAULT_MODEL` | No | `claude-sonnet-4-6` | Claude model ID |
| `MAX_TOKENS` | No | `2048` | Max tokens per agent call |
| `LOG_LEVEL` | No | `INFO` | Python logging level |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS origins |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend base URL |

---

## API Reference

### `GET /health`

Returns `{"status": "ok"}`. Used by Docker healthcheck.

---

### `POST /api/property/analyze`

Runs all agents and returns the complete report in one response.

**Request body**

```json
{
  "property": {
    "address": "12 Smith St",
    "suburb": "Parramatta",
    "state": "NSW",
    "postcode": "2150",
    "property_type": "house",
    "bedrooms": 3,
    "bathrooms": 2,
    "car_spaces": 1,
    "purchase_price": 800000,
    "estimated_rent_per_week": 700,
    "loan_amount": null,
    "interest_rate": 6.5,
    "loan_term_years": 30,
    "is_new_build": false,
    "year_built": null
  }
}
```

**Response** — `AnalyzeResponse` containing a `PropertyReport`.

---

### `POST /api/property/analyze/stream`

Same request body as above. Returns a **Server-Sent Events** stream. Each event has shape:

```
data: {"event": "<name>", "data": { ... }}
```

Events arrive in this order:

| Event | Arrives when |
|---|---|
| `rental_yield` | RentalYieldAgent finishes |
| `cashflow` | CashflowAgent finishes |
| `roi` | ROIAgent finishes |
| `location_risk` | LocationRiskAgent finishes |
| `investment_potential` | Synthesis agent finishes |
| `complete` | Full `PropertyReport` assembled |
| `error` | Any agent throws — contains `{"message": "..."}` |

---

## Running Tests

```bash
cd backend
uv run pytest -v
```

Tests use `httpx.AsyncClient` with `ASGITransport` — no real server needed. Orchestrator calls are mocked so tests never hit the Anthropic API.

---

## Frontend

The frontend is a Next.js 15 app (App Router, TypeScript, Tailwind CSS).

- **Hero page** — brown-themed landing with a house background image, app tagline, and stats
- **PropertyForm** — collects all required `PropertyInput` fields
- **AnalysisResults** — renders each agent's result as it arrives via SSE; shows skeleton loaders while waiting
- **Verdict banner** — prominently displays BUY / HOLD / AVOID with score and recommendation

```bash
cd frontend
npm run dev        # development
npm run build      # production build
npm start          # serve production build
```

---

## Deployment

### Azure (Docker)

A `docker-compose.prod.yml` is included for production. Copy `.env.prod.example` to `.env.prod`, fill in your API key and frontend URL, then:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

Set `ALLOWED_ORIGINS` to your public frontend URL so CORS works correctly.

### Vercel + Render / Railway

- Deploy the `frontend/` directory to Vercel. Set `NEXT_PUBLIC_API_URL` to your backend URL.
- Deploy the `backend/` directory to Render, Railway, or any container host. Set all backend env vars.
