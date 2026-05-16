# PropertyState AI — Frontend

Next.js 15 frontend for the PropertyState AI property investment analyser.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **next/image** for optimised images

## Getting Started

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | PropertyState AI backend URL |

## Pages

| Route | Description |
|---|---|
| `/` | Hero landing page + property analysis form and streaming results |

## How streaming works

The form submits to `POST /api/property/analyze/stream` on the backend. The response is a Server-Sent Events stream. As each of the five AI agents completes, a partial result card appears in the UI. A skeleton loader is shown while each card is waiting.

Event order: `rental_yield` → `cashflow` → `roi` → `location_risk` → `investment_potential` → `complete`.

## Build

```bash
npm run build   # production build
npm start       # serve production build
npx tsc --noEmit  # type check
```

## Docker

The `Dockerfile` in this directory produces a standalone Next.js image. It is used by `docker-compose.yml` at the project root.

```bash
# From project root
docker compose up --build frontend
```

The build arg `NEXT_PUBLIC_API_URL` is passed at build time from `docker-compose.yml`.
