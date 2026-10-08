# Technical note

## Decisions

- Prisma 8 contract and migration APIs are retained; legacy Prisma Client patterns and `schema.prisma` were not introduced.
- The official source registry is the crawl allowlist and records whether each source is official and primary.
- Gemini output is parsed and independently checked against the retrieved page; it does not determine verification status.
- Confidence points are awarded only when the corresponding evidence condition is satisfied.
- Successful processed content is hashed to avoid unnecessary model calls. Failed extraction is retried even if content is unchanged.
- Previous scholarship data survives crawler failures. No disappearance decision is inferred from a timeout, HTTP error, or other transient retrieval failure.
- The route is bearer-protected and compares credentials in constant time. Crawler execution uses bounded request work.

## Operational constraints

The deployment must support PostgreSQL 15+, the configured Gemini API, and Chromium for browser fallback. The protected run endpoint has a 300-second route maximum; actual limits vary by hosting plan. Schedule bounded runs and do not assume a single invocation can crawl an unrestricted web.

No production database, Gemini credential, real crawl, or acceptance dataset has been provided or exercised in this repository session. Treat live accuracy and record-count targets as unverified until run against an approved environment.
