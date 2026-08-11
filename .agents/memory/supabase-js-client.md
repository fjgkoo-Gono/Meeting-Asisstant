---
name: Supabase JS Client in api-server
description: How and why the api-server uses @supabase/supabase-js instead of Drizzle+pg, and the URL quirk to watch for.
---

## Rule
The `artifacts/api-server` uses `@supabase/supabase-js` (not Drizzle ORM + pg) to connect to the shared Supabase database. All routes in `src/routes/` use `supabase.from(...)` queries.

**Why:** The Replit-managed `DATABASE_URL` points to an environment-local PostgreSQL instance (separate for dev and production). The Supabase direct/pooler connection password kept failing authentication. Switching to the Supabase JS client uses `SUPABASE_URL` + `SUPABASE_KEY` which were already proven to work.

## SUPABASE_URL quirk
`SUPABASE_URL` was set as `https://[ref].supabase.co/rest/v1` (with path, for the Python backend). The Supabase JS `createClient` expects only the base origin. Fixed in `src/lib/supabase.ts` by using `new URL(url).origin` to strip the path before passing to `createClient`.

## Supabase setup requirements
Tables must exist and RLS must be disabled on all four tables:
```sql
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;
```
Schema SQL is in `scripts/supabase-schema.sql`.

## snake_case ↔ camelCase
Supabase returns snake_case column names. `src/lib/supabase.ts` exports `toCamel()` and `rowsToCamel()` helpers to convert before passing to Zod validators (which expect camelCase from Drizzle's prior mapping).

## How to apply
Any new route added to api-server must import from `../lib/supabase` (not `@workspace/db`) and convert results with `toCamel`/`rowsToCamel` before passing to Zod schemas.
