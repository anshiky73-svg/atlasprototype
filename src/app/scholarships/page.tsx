import type { Metadata } from "next";
import Link from "next/link";
import { ScholarshipTable } from "@/components/scholarship-table";
import { hasDatabaseConfig, hasGeminiConfig } from "@/lib/config/env";
import { getScholarships } from "@/features/scholarship-intelligence";

export const metadata: Metadata = { title: "Scholarships" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string | string[]; status?: string | string[] }>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ScholarshipsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = first(params.q) ?? "";
  const status = first(params.status) ?? "";
  const databaseReady = hasDatabaseConfig();
  const geminiReady = hasGeminiConfig();

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <span className="eyebrow">OPPORTUNITY DIRECTORY</span>
        <h1>Scholarships</h1>
        <p className="page-description">Search verified and review-required awards with their source evidence.</p>
      </section>
      {!databaseReady ? (
        <section className="setup-banner">
          <span className="setup-icon">i</span>
          <div><h2>Database not connected</h2><p>Configure DATABASE_URL to browse collected scholarship records.</p></div>
        </section>
      ) : (
        <>
          {!geminiReady && (
            <section className="setup-banner">
              <span className="setup-icon">i</span>
              <div>
                <h2>Scholarship extraction is disabled</h2>
                <p>Existing records remain available, but new records require GEMINI_API_KEY and GEMINI_MODEL.</p>
              </div>
              <Link className="button button-secondary" href="/crawler">Open crawler settings <span>→</span></Link>
            </section>
          )}
          <section className="section-card">
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
              <button className="button button-secondary" type="submit">Apply filters</button>
            </form>
            <ScholarshipTable scholarships={await getScholarships(query, status)} />
          </section>
        </>
      )}
    </div>
  );
}
