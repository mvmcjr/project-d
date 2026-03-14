# Copilot Instructions

## Project Overview

**Project D** is a client-side vehicle datalog visualization tool (inspired by Initial D). Users upload CSV files or Bootmod3 URLs to interactively analyze vehicle performance metrics. All data processing happens in the browser — no data is sent to any server.

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview Cloudflare deployment
npm run deploy    # Deploy to Cloudflare Workers
npm run cf-typegen  # Regenerate Cloudflare Worker types
```

No test framework is configured.

## Architecture

**Stack:** Next.js 15 (App Router) · React 19 · Vite · Tailwind CSS v4 · ShadCN UI · Recharts · Papaparse · Cloudflare Workers (via `vinext`)

**Data flow:**
1. `src/app/page.tsx` renders `<Dashboard>` inside a Suspense boundary
2. `<FileUpload>` accepts a CSV file or Bootmod3 URL; the proxy route at `src/app/api/proxy/route.ts` handles CORS for URL fetches
3. `useLogProcessor` parses the CSV (Papaparse), applies unit conversions, and produces typed `ParsedData`
4. `useChartState` owns all visualization state: selected series, zoom boundaries, pins, compare mode, search query
5. `useBroadcastSync` mirrors state across windows via the BroadcastChannel API
6. `<ChartView>` → `<ChartArea>` renders Recharts with synchronized tooltips, zoom, and custom dots
7. `worker/index.ts` is the Cloudflare Worker entry point; it delegates to `vinext/server/app-router-entry` and handles image optimization

**Key directories:**
- `src/components/chart/` — Recharts sub-components (tooltip, sidebar, zoom dialog, pins)
- `src/components/dashboard/` — Header controls (units, theme, export, reset)
- `src/components/ui/` — ShadCN UI primitives (do not edit manually; use the `shadcn` skill)
- `src/hooks/` — All domain state lives here; components are mostly presentational
- `src/lib/` — Pure utilities: `types.ts`, `conversions.ts`, `stats.ts`, `peaks.ts`, `utils.ts`

## Key Conventions

**Imports & exports:**
- Path alias `@/` maps to `src/` — always use it
- Use **named exports** for all components and hooks (no default exports)
- Import order: React → external libraries → `@/components` → `@/hooks` → `@/lib`

**Components:**
- Every interactive component starts with `"use client"`
- Props interfaces are defined directly above the component in the same file
- No class components; hooks only
- ShadCN components live in `src/components/ui/` — add new ones with `npx shadcn add <component>` (ShadCN style: **new-york**, base color: **neutral**)

**Styling:**
- Tailwind utility classes are the primary styling mechanism
- Theming uses CSS variables in `src/app/globals.css` (OKLch color space, dark mode default)
- Component variants use `class-variance-authority` (CVA)
- Dynamic chart colors are generated with the golden-angle HSL algorithm in `src/lib/utils.ts`

**State management:**
- No external state library — all state lives in custom hooks (`useChartState`, `useLogProcessor`, `useBroadcastSync`)
- Use `useMemo` for derived/expensive values; use `useCallback` for stable function references passed as props
- Cross-window sync uses BroadcastChannel (see `useBroadcastSync` + `src/lib/sync-utils.ts`)

**TypeScript:**
- Core types are in `src/lib/types.ts` (`DataPoint`, `ParsedData`, `ConversionSchema`, `UnitType`, etc.) — extend there, not inline
- Unit conversion logic is centralized in `src/lib/conversions.ts`

**Deployment:**
- The app deploys to **Cloudflare Workers** via `vinext` — not a standard Node.js server
- `wrangler.jsonc` configures the worker name (`project-d`), `nodejs_compat` flag, and asset handling
- Next.js image optimization is disabled (`unoptimized: true`) because Cloudflare handles it in `worker/index.ts`
- `skills-lock.json` manages Copilot skill versions; update with the `migrate-to-vinext` or `shadcn` skills as needed
