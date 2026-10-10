# Scholarship Intelligence

An evidence-first scholarship discovery and verification dashboard. The crawler retrieves pages from configured official sources, records content snapshots, classifies pages, extracts candidate fields with Gemini, validates evidence, calculates a deterministic confidence score, and keeps version/change history in PostgreSQL.

## Feature architecture

The application is organized around the scholarship-intelligence product domain rather than a single flat collection of utilities. Core data access for the dashboard and crawler lifecycle lives under `src/features/scholarship-intelligence`, while infrastructure concerns such as network fetches, discovery rules, verification logic, and Prisma access remain in the supporting `src/lib` layer.

The application does not treat model output as trusted by itself. Only configured official-source domains are crawlable, unsupported claims are stored as “Not specified,” and a scholarship is marked `VERIFIED` only when its evidence-backed score reaches 95/100.

## Requirements

- Node.js 20.9 or newer
- PostgreSQL 15 or newer
- A currently permitted Gemini API key and model for extraction
- Chromium installed for the Playwright fallback

## Local setup

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL`: direct PostgreSQL connection, used by Prisma CLI.
   - `DATABASE_URL_POOLED`: optional pooled connection, preferred by the app runtime.
   - `GEMINI_API_KEY` and `GEMINI_MODEL`: required to run extraction.
   - `CRON_SECRET`: random bearer token of at least 32 characters.
   - Optional crawler limits; defaults are in `.env.example`.

   Generate a secret with Node:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Keep `.env` private and never commit it.

3. Install the browser used for JavaScript-rendered pages:

   ```powershell
   npx playwright install chromium
   ```

4. Review and apply the Prisma migration route to a PostgreSQL database. The checked-in migrations currently contain a baseline and an additive `ContentSnapshot` migration; no database has been migrated as part of this implementation.

   Preview the migration route:

   ```powershell
   npx prisma db migrate --db "$env:DATABASE_URL" --show
   ```

   Apply only after confirming that the target database and migration route are correct:

   ```powershell
   npx prisma db migrate --db "$env:DATABASE_URL"
   ```

   Do not apply the baseline blindly to a database that already contains application data or schema. Inspect the migration graph and database state first.

5. Start the dashboard:

   ```powershell
   npm run dev
   ```

   Open <http://localhost:3000>. The dashboard requires a configured database. Use **Crawler** to view sources/runs and start a protected run.

## Running the crawler

The protected endpoint is `POST /api/crawler/run` and requires:

```http
Authorization: Bearer <CRON_SECRET>
```

The crawler page sends the secret from its password input; it is not rendered into server HTML. A scheduler can invoke the endpoint using the same header. Runs are bounded by `CRAWLER_MAX_PAGES_PER_RUN`, depth, request timeout, response limits, and per-domain concurrency. A crawl is not an unrestricted web search: the allowlist is maintained in `src/lib/discovery/config/seed-sources.ts`, currently covering the National Scholarship Portal, UGC, and AICTE domains.

Static HTML is parsed with Cheerio. Playwright is used when the static text is too short. Robots rules are checked before page retrieval, and redirects are restricted to registered official domains. Failed retrievals are recorded without deleting previously stored scholarship records.

## Confidence and lifecycle

The confidence score is deterministic:

| Criterion | Points |
|---|---:|
| Official source | 25 |
| Scholarship exists on official source | 20 |
| Official application URL | 10 |
| Eligibility evidence | 15 |
| Deadline evidence | 10 |
| Amount evidence | 5 |
| Current information | 10 |
| No conflicts | 5 |
| **Total** | **100** |

Scores of 95 or higher are `VERIFIED`; lower scores require review. Deadline status uses the centralized rules in `src/lib/status/status-engine.ts`. Extraction evidence and snapshots are associated with the crawl run; changes are recorded only when a supported, meaningful field value changes.

## Development checks

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

There is no test script or test suite configured yet. Production build and real-data acceptance require the environment and database setup above.

## Current implementation limits

- The application ships with three configured official seed sources; the source registry is not yet an administrative UI.
- Gemini credentials and a currently permitted model must be supplied by the operator.
- The database migrations have not been applied, and no live crawl or real-record acceptance target has been verified.
- Long-running deployments should invoke bounded runs through a scheduler appropriate to the host's execution limits.

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/CRAWLER-PIPELINE.md](./docs/CRAWLER-PIPELINE.md), [docs/DATABASE.md](./docs/DATABASE.md), [docs/CONFIGURATION.md](./docs/CONFIGURATION.md), and [docs/DEMO.md](./docs/DEMO.md).
