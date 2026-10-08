# Requirements and implementation status

| Requirement | Status |
|---|---|
| Seed/link/sitemap discovery, URL normalization, and de-duplication | Implemented for configured official sources |
| Bounded HTTP/Cheerio crawler with Playwright fallback | Implemented |
| Robots checks, time/size/depth/page/concurrency bounds | Implemented |
| Page classification before model extraction | Implemented |
| Gemini structured extraction and Zod validation | Implemented; operator credentials/model required |
| Field-level source evidence and unsupported-value handling | Implemented |
| Deterministic confidence score and 95-point verification threshold | Implemented |
| Transactional scholarship, version, evidence, and change persistence | Implemented |
| Content snapshots and crawl-run failure records | Implemented |
| Safe failure isolation and unchanged-content retry behavior | Implemented |
| Expiring/expired deadline statuses | Implemented |
| Evidence-backed disappearance status | Not implemented; network errors never imply disappearance |
| Searchable dashboard, scholarship details, evidence/history, crawler view | Implemented |
| Database-backed real-data targets | Not verified; migrations and live crawl have not been run |

See `docs/CRAWLER-PIPELINE.md` for operational details and `docs/CONFIGURATION.md` for required environment variables.
