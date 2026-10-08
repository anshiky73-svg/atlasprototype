# Architecture

The application is evidence-first: model responses are candidates, while source policy, validation, evidence support, confidence, and persistence are controlled by application code.

```text
Official seed sources
  -> discovery (links and sitemaps)
  -> normalized, prioritized URL queue
  -> bounded crawler (HTTP/Cheerio, Playwright fallback)
  -> content snapshots
  -> page rules and Gemini extraction
  -> Zod validation and evidence support checks
  -> official-source and conflict checks
  -> deterministic confidence/status
  -> repository services and Prisma 8/PostgreSQL
  -> dashboard, versions, changes, and re-verification
```

## Trust boundaries

- The registry in `src/lib/discovery/config/seed-sources.ts` defines eligible official domains and their source types.
- URL normalization and discovery filters reject unsupported protocols and obvious non-content/account routes.
- The crawler checks robots policy, constrains response size/time, validates redirects, and uses an explicit domain allowlist.
- Gemini sees bounded page content. Its output must satisfy the Zod schema and is not trusted as evidence unless the quoted text occurs in the retrieved page and supports the field value.
- The deterministic confidence engine and verification threshold make the final trust decision.
- A failed crawl is isolated from previously persisted scholarship records.

## Runtime layers

Crawler and discovery code call service/repository functions rather than embedding Prisma calls for URL/source/snapshot persistence. Scholarship updates, versions, evidence, and field changes are committed in a Prisma transaction. The app runtime prefers `DATABASE_URL_POOLED`; Prisma CLI uses the direct `DATABASE_URL`.

## Status lifecycle

- `ACTIVE`: verified information without an approaching or passed deadline.
- `EXPIRING_SOON`: verified deadline within the configured threshold.
- `EXPIRED`: deadline has passed.
- `REVIEW_REQUIRED`: evidence is incomplete, conflicting, or below the verification threshold.
- `NO_LONGER_VERIFIABLE`: reserved for a future evidence-backed disappearance workflow; a network failure alone must never set this status.

Deadline thresholds are centralized in `src/lib/status/status-engine.ts`.
