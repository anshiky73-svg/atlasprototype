# Configuration

Copy `.env.example` to `.env` and keep the resulting file out of version control.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Direct PostgreSQL connection for Prisma CLI/migrations. |
| `DATABASE_URL_POOLED` | No | Pooled runtime connection; takes precedence in the app when set. |
| `GEMINI_API_KEY` | For crawler | Gemini API credential. Never log or commit it. |
| `GEMINI_MODEL` | For crawler | Currently permitted model identifier. No model is silently selected. |
| `CRON_SECRET` | For crawler | Bearer credential, at least 32 characters. |
| `CRAWLER_USER_AGENT` | No | User-agent used by crawler requests. |
| `CRAWLER_TIMEOUT_MS` | No | Request timeout, 1,000–60,000 ms; default 20,000. |
| `CRAWLER_MAX_DEPTH` | No | Discovery depth, 0–5; default 2. |
| `CRAWLER_MAX_PAGES_PER_RUN` | No | Global page budget, 1–100; default 30. |
| `CRAWLER_CONCURRENCY_PER_DOMAIN` | No | Per-domain concurrency, 1–5; default 2. |
| `EXPIRING_SOON_DAYS` | No | Upcoming deadline window, 1–180 days; default 30. |

The protected route is `POST /api/crawler/run` with `Authorization: Bearer <CRON_SECRET>`. The web form sends the secret only with the request. Do not place credentials in query strings or logs.
