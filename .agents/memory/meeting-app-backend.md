---
name: Meeting App Backend
description: Projects and meetings data model, API routes, and a date coercion quirk between Orval Zod and Drizzle.
---

## Rule
When inserting meeting `date` values from request bodies validated by Orval-generated Zod schemas, convert the value to a YYYY-MM-DD string before passing to Drizzle.

**Why:** The `orval.config.ts` sets `useDates: true` for the Zod generator, which coerces `format: date` fields to JavaScript `Date` objects. But Drizzle's `date(..., { mode: "string" })` column expects a `YYYY-MM-DD` string, not a Date object. TypeScript will catch this, but the fix is explicit:

```typescript
const rawDate = body.data.date;
const dateStr = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate);
```

**How to apply:** Any route that receives a date-type field from a Zod-validated body (with Orval's useDates coercion active) and writes it to a Drizzle `date` column needs this conversion.

## Schema locations
- `lib/db/src/schema/projects.ts` — projectsTable
- `lib/db/src/schema/meetings.ts` — meetingsTable (has projectId FK → projects with cascade delete)

## Route locations
- `artifacts/api-server/src/routes/projects.ts` — GET/POST /projects, GET /projects/:id, GET /projects/:id/summary, GET /stats
- `artifacts/api-server/src/routes/meetings.ts` — GET/POST /projects/:id/meetings, GET /projects/:id/meetings/:meetingId
