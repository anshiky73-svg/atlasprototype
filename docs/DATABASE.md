# Database and migrations

The data contract is `src/prisma/contract.prisma`; generated contract artifacts are `src/prisma/contract.json` and `src/prisma/contract.d.ts`. The contract contains scholarships, official sources, discovered URLs, crawl runs, content snapshots, field evidence, versions, and change events.

Regenerate contract artifacts after intentional contract edits:

```powershell
npm run contract:emit
```

Current on-disk migrations are a baseline and an additive migration adding `ContentSnapshot`, crawl-run tracking for discovered URLs, indexes, and constraints. Inspect the migration graph and target database before applying:

```powershell
npx prisma migration check
npx prisma migration graph
npx prisma db migrate --db "$env:DATABASE_URL" --show
```

Apply only to the intended PostgreSQL database:

```powershell
npx prisma db migrate --db "$env:DATABASE_URL"
```

The repository's development migration route has not been applied to a live database. Do not apply a baseline to a database that already contains data/schema without first verifying the database's contract state and migration history. Existing `normalizedUrl` values may be null for legacy rows; new writes always normalize and persist the URL.

Scholarship, version, evidence, and change writes are transactional. Crawl-run and snapshot records are separate so failed retrievals remain observable without replacing last-known scholarship facts.
