import Link from "next/link";
import { MetricCard } from "@/components/metric-card";
import { ScholarshipTable } from "@/components/scholarship-table";
import { StatusBadge } from "@/components/status-badge";
import { hasDatabaseConfig } from "@/lib/config/env";
import { getDashboardData, getScholarships } from "@/lib/data/scholarships";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string | string[]; status?: string | string[] }>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No runs yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = first(params.q) ?? "";
  const status = first(params.status) ?? "";

  if (!hasDatabaseConfig()) {
    return (
      <div className="page-wrap">
        <section className="page-heading">
          <div>
            <span className="eyebrow">SCHOLARSHIP DISCOVERY</span>
            <h1>Find funding with confidence.</h1>
            <p className="page-description">A living, evidence-backed view of scholarships for students in India.</p>
          </div>
        </section>
        <section className="setup-banner">
          <span className="setup-icon">i</span>
          <div>
            <h2>Connect your database to get started</h2>
            <p>
              Set <code>DATABASE_URL</code> in your local environment, apply the Prisma 8 contract, and start the app again.
              No scholarship records are shown until they have been collected from real sources.
            </p>
          </div>
          <Link className="button button-secondary" href="/crawler">Setup guide <span>→</span></Link>
        </section>
        <section className="data-principle">
          <span className="eyebrow">OUR STANDARD</span>
          <h2>No guesses. Every fact has a source.</h2>
          <p>Scholarships are verified against primary sources. Unsupported facts remain unspecified and confidence is calculated by deterministic rules.</p>
        </section>
      </div>
    );
  }

  const [dashboard, scholarships] = await Promise.all([
    getDashboardData(),
    getScholarships(query, status),
  ]);

  return (
    <div className="page-wrap">
      <section className="page-heading heading-with-action">
        <div>
          <span className="eyebrow">SCHOLARSHIP DISCOVERY</span>
          <h1>Find funding with confidence.</h1>
          <p className="page-description">A living, evidence-backed view of scholarships for students in India.</p>
        </div>
        <Link className="button button-primary" href="/crawler"><span className="button-symbol">↻</span> Open crawler</Link>
      </section>

      <section className="metric-grid" aria-label="Scholarship statistics">
        <MetricCard label="URLs discovered" value={dashboard.totalDiscovered} detail="Official-source queue" accent="blue" />
        <MetricCard label="Verified awards" value={dashboard.verified} detail={`${dashboard.totalScholarships} extracted records`} accent="green" />
        <MetricCard label="Need review" value={dashboard.reviewRequired} detail="Below the verification threshold" accent="amber" />
        <MetricCard label="Average confidence" value={`${Math.round(dashboard.averageConfidence)}%`} detail={`${dashboard.active} active · ${dashboard.expired} expired`} accent="violet" />
      </section>

      <section className="section-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LATEST RECORDS</span>
            <h2>Scholarship opportunities</h2>
            <p>Search and inspect the evidence behind every result.</p>
          </div>
          <Link className="text-link" href="/scholarships">Browse all <span>→</span></Link>
        </div>
        <form className="filter-bar" method="get">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input name="q" defaultValue={query} placeholder="Search scholarships, providers, eligibility…" />
          </label>
          <label className="filter-select-label">
            <span className="visually-hidden">Filter by status</span>
            <select name="status" defaultValue={status}>
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRING_SOON">Expiring soon</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVIEW_REQUIRED">Review required</option>
              <option value="NO_LONGER_VERIFIABLE">Unverifiable</option>
            </select>
          </label>
          <button className="button button-secondary" type="submit">Search</button>
        </form>
        <ScholarshipTable scholarships={scholarships.slice(0, 8)} />
      </section>

      <div className="dashboard-bottom-grid">
        <section className="section-card source-card">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">TRUST BOUNDARY</span>
              <h2>Official sources first</h2>
            </div>
            <span className="round-icon">✓</span>
          </div>
          <p className="card-copy">AI extracts candidate facts. The application checks primary sources and evidence before it awards confidence points.</p>
          <div className="principle-row"><span className="principle-check">✓</span> Evidence tied to individual fields</div>
          <div className="principle-row"><span className="principle-check">✓</span> Deterministic 95% verification threshold</div>
          <div className="principle-row"><span className="principle-check">✓</span> Version history preserves meaningful changes</div>
          <Link className="text-link" href="/crawler">Review the pipeline <span>→</span></Link>
        </section>
        <section className="section-card run-summary-card">
          <div className="section-heading compact-heading">
            <div>
              <span className="eyebrow">AUTOMATION</span>
              <h2>Latest crawler run</h2>
            </div>
            {dashboard.latestRun && <StatusBadge value={dashboard.latestRun.status} />}
          </div>
          {dashboard.latestRun ? (
            <>
              <p className="run-date">Started {formatDate(dashboard.latestRun.startedAt)}</p>
              <div className="run-stats">
                <div><strong>{dashboard.latestRun.discoveredCount}</strong><span>discovered</span></div>
                <div><strong>{dashboard.latestRun.crawledCount}</strong><span>crawled</span></div>
                <div><strong>{dashboard.latestRun.verifiedCount}</strong><span>verified</span></div>
              </div>
            </>
          ) : (
            <p className="empty-run">No crawler runs recorded yet. Start a bounded discovery run when configuration is ready.</p>
          )}
          <Link className="button button-secondary full-button" href="/crawler">View crawler activity <span>→</span></Link>
        </section>
      </div>
    </div>
  );
}
