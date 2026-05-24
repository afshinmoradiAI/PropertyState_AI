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
├── render.yaml                          # Render Blueprint (recommended)
└── deploy/
    ├── aws/
    │   ├── apprunner-backend.json       # AWS App Runner — backend service config
    │   └── apprunner-frontend.json      # AWS App Runner — frontend service config
    └── azure/
        ├── containerapp-backend.yaml    # Azure Container Apps — backend
        └── containerapp-frontend.yaml   # Azure Container Apps — frontend
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
| `DATA_DIR` | No | `./data` | Directory for the SQLite DB file |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:8000` | Backend base URL |

---

## API Reference

### `GET /health`

Returns `{"status": "ok"}`. Used by Docker healthcheck.

---

### Library endpoints

| Route | Description |
|---|---|
| `GET /api/library?limit=50&offset=0` | Paginated list of saved report summaries |
| `GET /api/library/{id}` | Full saved `PropertyReport` |
| `DELETE /api/library/{id}` | Delete a saved report |

Every completed analysis is automatically saved. The streaming endpoint also emits a `saved` event after `complete`:

```
data: {"event": "saved", "data": {"report_id": "abc123…"}}
```

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

### Render (recommended — one-click Blueprint)

The repo ships with a `render.yaml` Blueprint that defines both services + a persistent 1GB disk for the SQLite database.

**Steps:**

1. Push this repo to GitHub.
2. In the [Render dashboard](https://dashboard.render.com), click **New → Blueprint** and connect this repo.
3. Render will read `render.yaml` and propose two services:
   - `propertystate-backend` (FastAPI + SQLite + 1GB disk at `/app/data`)
   - `propertystate-frontend` (Next.js standalone)
4. Set the env vars marked `sync: false` (see below).
5. Click **Apply**. First deploy takes ~5 minutes.

**Env vars to fill in:**

| Service | Variable | Value |
|---|---|---|
| Backend | `ANTHROPIC_API_KEY` | Your Anthropic API key |
| Frontend | `NEXT_PUBLIC_API_URL` | Backend URL — set **before** first build (baked into bundle) |

After the first deploy you'll have two URLs. Go back and fill in the cross-service URLs:

| Service | Variable | Value |
|---|---|---|
| Backend | `ALLOWED_ORIGINS` | `https://propertystate-frontend-XXXX.onrender.com` |
| Backend | `FRONTEND_URL` | Same as above (used in password-reset emails + OAuth callbacks) |

Then click **Manual Deploy → Clear cache and deploy** on each service to pick up the new values.

**Optional vars** (leave blank unless you use them): `SENTRY_DSN`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`.

**Plan choice:**
- **Starter ($7/mo per service)** — no cold starts, persistent disk works. Recommended.
- **Free** — services sleep after 15 min, disk is ephemeral (SQLite data is lost on restart). OK for testing only.

`JWT_SECRET` is generated automatically by Render via `generateValue: true`.

---

### AWS App Runner

Configs: `deploy/aws/apprunner-backend.json` + `deploy/aws/apprunner-frontend.json`.

App Runner is the AWS equivalent of Render — fully managed containers, autoscaling, HTTPS out of the box. Note: App Runner does **not** support persistent volumes, so SQLite will reset on container replacement. For production, migrate to RDS PostgreSQL or use ECS Fargate with EFS.

**Steps:**

1. Push backend + frontend images to ECR (see header comments in the JSON files).
2. Store secrets in AWS Secrets Manager:
   ```bash
   aws secretsmanager create-secret --name propertystate/ANTHROPIC_API_KEY --secret-string "sk-ant-..."
   aws secretsmanager create-secret --name propertystate/JWT_SECRET --secret-string "$(openssl rand -hex 32)"
   ```
3. Create the IAM role `AppRunnerECRAccessRole` (trust policy: `build.apprunner.amazonaws.com`).
4. Replace `ACCOUNT`, `REGION`, and `FRONTEND_URL` placeholders in both JSON files.
5. Deploy the backend first:
   ```bash
   aws apprunner create-service --cli-input-json file://deploy/aws/apprunner-backend.json --region us-east-1
   ```
6. Take the backend's public URL, rebuild the frontend image with `--build-arg NEXT_PUBLIC_API_URL=https://BACKEND_URL`, push to ECR, then deploy the frontend:
   ```bash
   aws apprunner create-service --cli-input-json file://deploy/aws/apprunner-frontend.json --region us-east-1
   ```
7. Update the backend's `ALLOWED_ORIGINS` + `FRONTEND_URL` env vars to the frontend's public URL, then redeploy with `aws apprunner update-service`.

---

### Azure Container Apps

Configs: `deploy/azure/containerapp-backend.yaml` + `deploy/azure/containerapp-frontend.yaml`.

Container Apps is Azure's managed serverless container platform — autoscaling, HTTPS ingress, secrets store, optional Azure Files mounts for persistent SQLite.

**Steps:**

1. Create resource group + Container Apps environment:
   ```bash
   az group create --name propertystate-rg --location eastus
   az containerapp env create --name propertystate-env --resource-group propertystate-rg --location eastus
   ```
2. Create Azure Container Registry and push images:
   ```bash
   az acr create --resource-group propertystate-rg --name propertystateacr --sku Basic
   az acr login --name propertystateacr
   docker build -t propertystateacr.azurecr.io/propertystate-backend:latest ./backend
   docker push propertystateacr.azurecr.io/propertystate-backend:latest
   ```
3. Replace `ACR_NAME`, `REGISTRY_PASSWORD`, `SUB_ID`, and URL placeholders in both YAML files. Paste real values for the `anthropic-api-key` and `jwt-secret` entries in the backend YAML.
4. Deploy the backend first:
   ```bash
   az containerapp create \
     --resource-group propertystate-rg --name propertystate-backend \
     --environment propertystate-env \
     --yaml deploy/azure/containerapp-backend.yaml
   ```
5. Capture its FQDN, rebuild the frontend image with `--build-arg NEXT_PUBLIC_API_URL=https://<backend-fqdn>`, push, then deploy the frontend:
   ```bash
   az containerapp create \
     --resource-group propertystate-rg --name propertystate-frontend \
     --environment propertystate-env \
     --yaml deploy/azure/containerapp-frontend.yaml
   ```
6. Update the backend's `ALLOWED_ORIGINS` + `FRONTEND_URL` env vars to the frontend's FQDN and run `az containerapp update`.

For persistent SQLite, uncomment the `volumeMounts` + `volumes` block in `containerapp-backend.yaml` and configure an Azure Files share on the Container Apps environment.
