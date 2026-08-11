---
name: Orval Zod Integer Issue
description: Orval v8 generates zod.int() for OpenAPI integer types, but this project uses Zod v3 which doesn't have .int() as a top-level method.
---

## Rule
Use `type: number` instead of `type: integer` in the OpenAPI spec for numeric fields (IDs, counts, etc.) to get `zod.number()` in generated code instead of `zod.int()`.

**Why:** Orval v8 targets Zod v4 API with `zod.int()`, but the workspace catalog pins Zod at ^3.25.76. The `zod.int()` call causes a TypeScript error during the `typecheck:libs` step that runs after codegen, failing the whole codegen pipeline.

**How to apply:** Whenever writing an OpenAPI spec for this project, use `type: number` for integer-valued fields (IDs, counters, etc.). The values from PostgreSQL `serial`/`integer` columns are still actual integers; Zod will accept them as numbers. Path parameters that need coercion from string → number also use `type: number`.
