@AGENTS.md

# Frontend — Claude Code Instructions

## Stack

- **Next.js 15** (App Router, `app/` directory)
- **TypeScript** — strict mode
- **Tailwind CSS** — utility classes preferred; inline `style={{}}` only for exact brand hex values
- **next/image** — use for all `<img>` elements; Unsplash is whitelisted in `next.config.ts`

## File map

```
app/
├── page.tsx               # Hero landing + analysis page (entry point)
├── layout.tsx             # Root layout, metadata, fonts
├── globals.css            # Tailwind base styles
├── components/
│   ├── PropertyForm.tsx   # Controlled form → emits PropertyInput on submit
│   └── AnalysisResults.tsx # Renders streaming SSE results with skeleton loaders
└── types/
    └── property.ts        # TypeScript types — must mirror backend Pydantic schemas
```

## Brand colours

| Token | Hex | Usage |
|---|---|---|
| Darkest brown | `#1A0F07` | Header bg, footer bg |
| Dark brown | `#2C1A0E` | Page bg, headings |
| Medium brown | `#6B3A1F` | Secondary text |
| Saddle brown | `#8B5E3C` | Labels, section badges |
| Tan | `#C4956A` | Accent, button gradients |
| Cream | `#F5EDE3` | Analysis section bg |

## SSE streaming

`page.tsx` connects to `POST /api/property/analyze/stream` and parses SSE events.
Event names: `rental_yield`, `cashflow`, `roi`, `location_risk`, `investment_potential`, `complete`, `error`.
Each partial result is merged into `PartialResults` state, which `AnalysisResults` renders progressively.

## Key rules

- **Types first** — any backend schema change must be reflected in `app/types/property.ts` before touching components
- **No data fetching in components** — all API calls live in `page.tsx`; components receive data as props
- **Skeleton loaders** — when a card's data prop is `undefined` and `loading` is `true`, render an animated skeleton (`animate-pulse`)
- Keep `PropertyForm` a controlled, uncontrolled-free component — every field lives in `form` state
- The `API` constant (`process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'`) is the single source of the backend URL

## Dev commands

```bash
npm run dev          # start dev server (default port 3000)
npm run build        # production build
npm start            # serve production build
npx tsc --noEmit     # type check only
```

## Adding a new result card

1. Add the TypeScript type to `app/types/property.ts`
2. Add the prop to `AnalysisResults` props interface
3. Add the SSE event handler in `page.tsx` (`handleSubmit`)
4. Render a new `<Card>` in `AnalysisResults.tsx` with a skeleton fallback
