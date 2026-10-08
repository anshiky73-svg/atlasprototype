# Crawler pipeline

1. **Discover.** Enabled seed sources are loaded from the registry. The discovery service inspects seed-page links and robots-listed/default sitemaps, normalizes URLs, applies URL filters, and queues same-source candidates. Candidates are ordered by depth and scholarship-related URL signals.
2. **Bound.** A per-run page budget, depth limit, request timeout, response-size limit, retry policy, and per-domain concurrency constrain the run. Sitemaps and robots responses have independent size/depth bounds.
3. **Retrieve.** Static content uses HTTP and Cheerio. Playwright is the fallback for pages with very little static text. Redirects must remain on an enabled official source domain.
4. **Snapshot.** Requested/final URL, HTTP status, text, content hash, timestamp, and retrieval errors are stored in `ContentSnapshot`.
5. **Classify and extract.** Rule-based page classification skips login, policy, navigation, and unrelated content before Gemini extraction. Gemini receives bounded text and is instructed not to infer missing values.
6. **Validate and support.** Zod validates the response. Evidence quotes must be present in the page content and support the corresponding value; unsupported fields become “Not specified.”
7. **Verify and persist.** The score is deterministic; records below 95 require review. Changes, versions, and field evidence are associated with the run and saved transactionally.
8. **Re-run safely.** Unchanged successfully processed content skips model extraction, while failed extraction remains retryable even when the page hash is unchanged. Failed retrievals do not delete last-known scholarship data.

## Failure handling

Each candidate is isolated so one failed page does not cancel other candidates. Failures are recorded in the run, URL record, and snapshot when the URL was attempted. A failed request is not evidence that a scholarship disappeared. Successful absence/conflict workflows need stronger source-specific evidence before setting `NO_LONGER_VERIFIABLE`.

## Operating limits

Defaults and ranges are defined in `src/lib/config/crawler.ts`. The supported sources are deliberately limited to the registry; adding a source requires an operator to verify official ownership and update the registry. Keep long-running deployments chunked into bounded scheduled requests.
