# Local demo

1. Configure `.env`, install dependencies, install Chromium, and apply the reviewed database migrations as described in the README.
2. Start the app with `npm run dev` and open the dashboard.
3. Open **Crawler** to inspect configured sources and recent crawl runs.
4. Enter the configured `CRON_SECRET` and start a run. The run is bounded by the configured page/depth limits.
5. Review the dashboard and scholarship detail pages. Each persisted field should be interpreted alongside its evidence, confidence, source, and retrieval time.

The app does not insert fabricated scholarship examples. Before credentials and a database are configured, the crawler and real-data acceptance counts cannot be demonstrated. A run that fails because configuration is missing should be treated as an environment setup issue, not as a successful data crawl.
