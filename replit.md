# Meeting Assistant

Gestiona proyectos y reuniones: sube materiales (PDF, Excel, PPTX, fotos, audio),
transcribe y extrae texto automáticamente, y chatea con Claude usando ese
contexto para resumir o consultar cada reunión/proyecto.

## Run & Operate

- `pnpm install` — install all workspace dependencies (run once, and again after pulling changes that touch `package.json`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, from `artifacts/api-server/.env`)
- `pnpm --filter @workspace/meeting-app run dev` — run the web app (port 5173, proxies `/api` to `localhost:8080`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: see `artifacts/api-server/.env.example` and `artifacts/meeting-app/.env.example` (copy each to `.env` and fill in real values — never commit `.env`). `API_SHARED_SECRET`/`VITE_API_SHARED_SECRET` must match exactly; generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Web: Vite + React 19 + Tailwind, PWA (`vite-plugin-pwa`)
- API: Express 5
- DB + file metadata: Supabase (`@supabase/supabase-js`) — **not** Drizzle/Postgres directly, despite `lib/db` existing in the workspace (legacy, unused at runtime)
- File storage: Supabase Storage for PDF/Excel/PPTX/audio, Cloudinary for images
- Transcription: Gladia (speaker diarization)
- AI chat: Anthropic Claude (`@anthropic-ai/sdk`)
- Build: esbuild (API, CJS-compatible ESM bundle), Vite (web)

## Where things live

- `artifacts/meeting-app` — web frontend (Vite/React PWA)
- `artifacts/api-server` — Express API; routes in `src/routes/`, storage/extraction/AI helpers in `src/lib/`
- `artifacts/meeting-mobile` — Expo/React Native app (shares the same API, currently out of active scope)
- `scripts/supabase-schema.sql` — run once in the Supabase SQL Editor to create the `projects`/`meetings`/`materials`/`chat_messages` tables (RLS must stay disabled on all four)
- `artifacts/meeting-assistant`, `artifacts/meeting-assistant-deck`, `artifacts/mockup-sandbox` — abandoned prototypes/decks, not part of the running app

## Architecture decisions

- **No Drizzle/Postgres at runtime.** `lib/db` (Drizzle schema) exists in the workspace but `api-server` talks to Supabase directly via `@supabase/supabase-js`. DB rows are snake_case; `src/lib/supabase.ts` exports `toCamel`/`rowsToCamel` to convert before Zod validation.
- **File storage is Supabase Storage now**, except images which stay on Cloudinary (Cloudinary blocks raw/binary delivery for PDF/Excel, and rejects large audio as video). PDF/Excel/audio used to live in Replit Object Storage (`gcs://` refs) — that only works inside a Replit workspace (auths via an internal sidecar), so it was migrated to Supabase Storage (`supa://` refs) to run outside Replit. See `artifacts/api-server/scripts/migrate-gcs-to-supabase.mjs` for the one-time migration (had to run from the Replit Shell, since only Replit can reach its own sidecar).
  - One audio file (material id 49) exceeds Supabase Storage's free-tier 50MB per-file limit and was intentionally left on `gcs://` — `storage.ts` keeps the GCS read/delete path alive for it. That file only opens/deletes while the API runs inside Replit; everywhere else it 500s. Raise the bucket's file size limit in the Supabase dashboard (Storage → `meeting-materials` → Edit bucket) if the plan allows, then re-run the migration script to finish moving it.
  - **This limit will hit future uploads too**: multer accepts files up to 100MB, but any new audio/PDF/Excel over the Supabase bucket's size cap (50MB on the free tier) will upload past multer, then fail at the Supabase Storage step with "The object exceeded the maximum allowed size". Worth raising the bucket limit proactively if long meeting recordings are common.
- **Audio transcription uploads the buffer directly to Gladia** (`/v2/upload`) rather than pointing Gladia at a storage URL — avoids auth/reachability issues with third-party storage URLs, and means transcription works the same whether the server is public or running on localhost.
- **API access control is a shared secret, not real auth.** `src/middlewares/auth.ts` checks `Authorization: Bearer <API_SHARED_SECRET>` on all `/api/*` routes (except `/healthz`); the frontend sends it via `setAuthTokenGetter` in `main.tsx`. It ships inside the built JS bundle, so it only deters untargeted bots hitting a public deployment from running up API costs — not a defense against someone reading the frontend source. Disabled automatically when `API_SHARED_SECRET` is unset. CORS (`ALLOWED_ORIGINS`) is similarly locked to specific origins instead of wide open.
- **PPTX text extraction uses JSZip** on the raw binary (unzip → parse `<a:t>` DrawingML runs), not a Vision API — instant and free.

## Product

Multi-project meeting tracker: each project has meetings, each meeting has materials
(files or pasted text) that get auto-processed into extracted text, and a chat
interface (per-meeting or per-project) that lets you ask Claude questions using
that extracted context.

## Gotchas

- Orval-generated Zod schemas coerce `format: date` fields to JS `Date` objects; Drizzle-mode inserts (if ever reintroduced) need a `YYYY-MM-DD` string, not a `Date`.
- `SUPABASE_URL` may be set as a full REST path (`.../rest/v1`); `src/lib/supabase.ts` strips it to the origin before calling `createClient`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
