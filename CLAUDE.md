# PropertyState AI — Claude Code Instructions

## What this project is

PropertyState AI is a property investment analysis platform for the Australian market. A user submits property details and five parallel Claude agents (via the Anthropic SDK) return a full investment report streamed in real time via SSE.

---

## Repo layout

```
backend/   — FastAPI + Anthropic SDK (Python 3.12, uv)
frontend/  — Next.js 15, TypeScript, Tailwind CSS
```

See `README.md` for the full project structure.

---

## Key conventions — read before touching any file

### Agents (`backend/app/agents/`)

- Every agent **must** inherit `BaseAgent` (`app/core/base_agent.py`)
- Load system prompt via `self.load_prompt()` — it reads from `app/prompts/<name>.md`
- Signature: `async def run(...) -> tuple[PydanticModel, int]` (result + tokens used)
- No agent may call another agent directly — route through the orchestrator
- No silent exception handling — let errors bubble up
- Every new agent needs a test in `tests/test_agents/`
- Every new agent must be registered in `PropertyAnalysisOrchestrator` (`app/core/orchestrator.py`)

See `.claude/rules/agent-conventions.md` for the full agent ruleset.

### API routes (`backend/app/api/`)

- All endpoints are `async`
- Request/response bodies are Pydantic models from `app/schemas/property.py`
- Routes live in `api/routes_<feature>.py` and are registered in `main.py`
- Long-running tasks return SSE via `StreamingResponse`
- Errors return RFC 7807 problem-details JSON
- Every route needs at least one test in `tests/test_api/`

See `.claude/rules/api-conventions.md` for the full API ruleset.

### Schemas (`backend/app/schemas/property.py` and `suburb.py`)

All Pydantic models are defined here. The TypeScript types in `frontend/app/types/property.ts`, `suburb.ts`, and `library.ts` must stay in sync whenever schemas change.

### Persistence (`backend/app/core/db.py`, `services/report_store.py`)

- SQLite via `aiosqlite` (async). DB file lives at `${DATA_DIR}/propertystate.db`. WAL mode + foreign keys enabled.
- Schema is bootstrapped on app startup via `init_db()` in the FastAPI lifespan handler.
- `report_store.py` is the only module that reads/writes the `reports` table. Routes never touch SQLite directly.
- Completed analyses (both `/analyze` and `/analyze/stream`) auto-save and return a `report_id`.
- Tests use `tmp_path` + `monkeypatch` to point `DATA_DIR` at a temp dir per test.

### Prompts (`backend/app/prompts/`)

- One `.md` file per agent, named `<agent_name>.md`
- Prompts contain **only** the system instructions — no Python logic
- Each prompt must instruct the model to return a JSON code block matching the agent's output schema

---

## Development commands

### Backend

```bash
cd backend
uv sync                                           # install deps
uv run uvicorn app.main:app --reload --port 8000  # dev server
uv run pytest -v                                  # tests
uv run ruff check .                               # lint
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # dev server (port 3000 by default)
npm run build      # production build
npx tsc --noEmit   # type check
```

### Docker (full stack)

```bash
cp backend/.env.example backend/.env   # set ANTHROPIC_API_KEY
docker compose up --build
```

---

## Environment

| Variable | Where | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | `backend/.env` | Required — never commit real keys |
| `DEFAULT_MODEL` | `backend/.env` | Default: `claude-sonnet-4-6` |
| `ALLOWED_ORIGINS` | `backend/.env` | CORS — add frontend URL in prod |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Default: `http://localhost:8000` |

---

## Adding a new agent — checklist

1. Create `backend/app/agents/<name>_agent.py` inheriting `BaseAgent`
2. Create `backend/app/prompts/<name>_agent.md` with the system prompt
3. Add output schema to `backend/app/schemas/property.py`
4. Register the agent in `PropertyAnalysisOrchestrator`
5. Add TypeScript types to `frontend/app/types/property.ts`
6. Write tests in `backend/tests/test_agents/test_<name>_agent.py`

Use the `/add-agent` slash command to scaffold steps 1–2 automatically.

---

## Testing approach

- Tests live in `backend/tests/test_agents/` and `backend/tests/test_api/`
- API tests use `httpx.AsyncClient` with `ASGITransport` — no live server needed
- Orchestrator/agent calls are mocked with `unittest.mock.AsyncMock` — tests never call the Anthropic API
- Run with: `uv run pytest -v`

---

## Frontend styling

- Tailwind CSS utility classes — prefer them over inline styles
- Where exact hex colours are needed (brand browns), inline `style={{}}` is acceptable
- Brand palette: `#1A0F07` (darkest), `#2C1A0E`, `#6B3A1F`, `#8B5E3C`, `#C4956A`, `#F5EDE3` (cream)
- Do not change the hero house image URL without confirming the replacement is publicly accessible

---

## What NOT to do

- Do not add a new agent without updating the orchestrator and writing a test
- Do not put business logic in prompt `.md` files
- Do not use `global` state in agents
- Do not catch exceptions silently in agents
- Do not commit `.env` files with real API keys
- Do not call `client.messages.create` directly from routes — go through an agent
