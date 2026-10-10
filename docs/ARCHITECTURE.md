# Short technical note

## Architecture

The system is organized as an evidence-first scholarship intelligence pipeline. Discovery, crawling, classification, extraction, verification, persistence, and dashboard access are separated into feature and library boundaries under `src/lib` and `src/features/scholarship-intelligence`.

```text
Official seed sources
  -> discovery and domain filtering
  -> normalized URL queue
  -> bounded crawl + snapshot persistence
  -> page classification
  -> structured extraction (Gemini JSON schema)
  -> evidence validation and source checks
  -> deterministic confidence and status
  -> Prisma/PostgreSQL persistence
  -> dashboard, change logs, and source views
```

The app keeps trust decisions in application code rather than in model output. The system does not mark a scholarship as verified just because the model returned a value; the value must be supported by quoted source text and pass deterministic checks.

## Technology choices

- Next.js 16 (App Router) for the web app and server routes.
- TypeScript for typed contracts and configuration.
- Prisma 8 with PostgreSQL for persistence, versioning, source metadata, and crawl records.
- Cheerio for HTML parsing and lightweight extraction support, with Playwright available as a fallback for problematic pages.
- Gemini API for structured extraction, constrained by a strict JSON schema and bounded text input.
- Zod for schema validation and fail-closed parsing.
- Deterministic scoring in application code, not LLM-based judgment.

## Discovery methodology

Discovery starts from a curated registry of official seed sources (`src/lib/discovery/config/seed-sources.ts`) and validates domains against an allowlist before crawling.

The flow includes:
- canonical URL normalization and duplicate suppression;
- source-aware discovery from sitemaps and internal links;
- filtering for supportable protocols, HTML pages, and official domains;
- `DiscoveredUrl` persistence with a crawl-run record so discovery results are auditable.

The system deliberately avoids open-web crawling beyond the approved official-source network and rejects redirect-heavy or unsupported destinations.

## Extraction methodology

A candidate page is classified as a scholarship page before extraction. The crawl pipeline stores a content snapshot and then sends only bounded page text to Gemini with a strict extraction schema for fields such as name, provider, amount, eligibility, dates, documents, selection process, and application URL.

The extraction contract enforces:
- all values are returned as strings;
- unspecified values are mapped to `Not specified`;
- evidence items require a field and verbatim supporting quote.

The app does not rely on free-form model reasoning for the final fact set. It requires the raw page text to support the extracted value.

## Verification methodology

Verification is explicit and deterministic. After extraction, the system validates that:
- the scholarship appears on an official registered source;
- the application URL is official or policy-compliant;
- no conflicting field values exist across records or within the same page;
- core evidence exists for eligibility, deadline, or amount;
- current information is still within the configured freshness window.

Records that fail these checks are kept as `REVIEW_REQUIRED` instead of being promoted to verified status.

## Confidence-score methodology

The confidence score is computed in `src/lib/verification/confidence.ts` from weighted checks:

- official source: 25
- exists on official source: 20
- official application URL: 10
- eligibility evidence: 15
- deadline evidence: 10
- amount evidence: 5
- current information: 10
- no conflicts: 5

The total score uses `VERIFIED_THRESHOLD = 80`, but a record must also pass mandatory checks for source trust, evidence presence, and conflict-free data before it can become `VERIFIED`.

## Anti-hallucination approach

The project uses a fail-closed design:
- model output is treated as untrusted candidate text;
- evidence quotes must appear verbatim in the source page;
- field values that do not match the evidence quote are converted to `Not specified`;
- unsupported or mismatched facts are rejected before persistence;
- the application never infers missing facts from outside knowledge.

This is enforced by `buildSupportedExtraction()` in `src/lib/extraction/evidence.ts` and by deterministic verification logic.

## Change detection

The system detects changes using content hashes, previous crawl state, and persisted scholarship metadata. When a discovered URL is re-crawled, the current content hash is compared to the previous hash, and only changed records are reprocessed. Scholarship updates are recorded in a transactional path with source metadata, evidence, and field-level change tracking so the dashboard can display revisions without overwriting the evidence trail.
