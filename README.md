# Product Engineering — DXOne

A front-end prototype of DXOne's Product Engineering orchestration platform: Leadership, Product Manager, Engineering, QA and Customer Success workspaces built around a shared Initiative → Epic → Story → Task hierarchy, with automatic cross-role workflow handoffs and a role-aware AI panel.

This is a **static, client-only wireframe** — all data lives in `src/data.ts` as in-memory mock/seed data. There is no backend, no database, and no API keys or secrets anywhere in the project.

## Stack

- React 19 + TypeScript 5.7
- Vite 8
- Tailwind CSS v4 (via `@tailwindcss/vite`, no config file)

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

## Deploying to Vercel

No environment variables are required. When importing this repo into Vercel:

- **Framework preset:** Vite
- **Build command:** `npm run build` (or `vite build`)
- **Output directory:** `dist`
- **Install command:** `npm install`

That's it — the app builds and runs entirely from static seed data.
