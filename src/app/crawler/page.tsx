import type { Metadata } from "next";
import { RunCrawler } from "@/components/run-crawler";
import { StatusBadge } from "@/components/status-badge";
import { getCrawlRuns, getSources } from "@/features/scholarship-intelligence";
import { hasDatabaseConfig, hasGeminiConfig } from "@/lib/config/env";

export const metadata: Metadata = { title: "Crawler activity" };
export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "In progress";
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

function safeRunErrorSummary(value: string | null) {
  if (!value) return null;

  const secrets = [
    process.env["DATABASE_URL"],
    process.env["DATABASE_URL_POOLED"],
    process.env["GEMINI_API_KEY"],
    process.env["CRON_SECRET"],
  ].filter((secret): secret is string => Boolean(secret));

  return value.split("\n").map((line) => {
    const separator = line.indexOf(": ");
    if (separator < 0) {
      return secrets.reduce((summary, secret) => summary.replaceAll(secret, "[redacted]"), line);
    }

    let source = line.slice(0, separator);
    try {
      const url = new URL(source);
      source = `${url.origin}${url.pathname}`;
    } catch {
      source = "[source]";
    }
    const message = secrets.reduce(
      (summary, secret) => summary.replaceAll(secret, "[redacted]"),
      line.slice(separator + 2),
    );
    return `${source}: ${message}`;
  }).join("\n");
}

export default async function CrawlerPage() {
  const databaseReady = hasDatabaseConfig();
  const [runs, sources] = databaseReady
    ? await Promise.all([getCrawlRuns(), getSources()])
    : [[], []];
  const runConfigurationMessage = !databaseReady
    ? "Set DATABASE_URL to enable crawler runs."
    : !hasGeminiConfig()
      ? "Set GEMINI_API_KEY and GEMINI_MODEL to enable extraction."
      : null;

  return (
    <div className="page-wrap">
      <section className="page-heading">
        <span className="eyebrow">AUTOMATION & SOURCES</span>
        <h1>Crawler activity</h1>
        <p className="page-description">Bounded, repeatable discovery runs against registered official sources.</p>
      </section>
      {!databaseReady && (
        <section className="setup-banner"><span className="setup-icon">i</span><div><h2>Database not connected</h2><p>Configure DATABASE_URL before starting crawler runs.</p></div></section>
      )}
      <RunCrawler
        configured={runConfigurationMessage === null}
        configurationMessage={runConfigurationMessage ?? ""}
      />
      <section className="section-card">
        <div className="section-heading">
          <div><span className="eyebrow">SOURCE REGISTRY</span><h2>Registered primary sources</h2><p>Discovery and verification are limited to the explicitly registered official domains.</p></div>
        </div>
        <div className="source-registry">
          {sources.length === 0 ? (
            <div className="empty-state small-empty"><h3>Sources register during the first run</h3><p>Seed sources are maintained in configuration; no record is created until a crawler run starts.</p></div>
          ) : sources.map((source) => (
            <article className="registry-row" key={source.id}>
              <span className="registry-symbol">✓</span>
              <div><strong>{source.name}</strong><span>{source.domain} · {source.sourceType}</span></div>
              <span className="registry-tag">{source.isPrimarySource ? "Primary source" : "Discovery only"}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">RUN HISTORY</span><h2>Recent crawl runs</h2><p>Failures are retained for review; they never delete a previously verified record.</p></div></div>
        {runs.length === 0 ? (
          <div className="empty-state small-empty"><h3>No runs to show</h3><p>Configure the database and extraction settings, then start the first run.</p></div>
        ) : (
          <div className="table-scroll">
            <table className="scholarship-table run-table">
              <thead><tr><th>Run</th><th>Started</th><th>Discovered</th><th>Crawled</th><th>Extracted</th><th>Saved</th><th>Verified</th><th>Review</th><th>Failures</th><th>Status</th></tr></thead>
              <tbody>{runs.map((run) => (
                <tr key={run.id}>
                  <td>#{run.id}</td><td>{formatDate(run.startedAt)}</td><td>{run.discoveredCount}</td>
                  <td>{run.crawledCount}</td><td>{run.extractedCount}</td>
                  <td>{run.newScholarshipCount + run.updatedScholarshipCount}</td>
                  <td>{run.verifiedCount}</td><td>{run.reviewRequiredCount}</td><td>{run.failedCount}</td>
                  <td>
                    <StatusBadge value={run.status} />
                    {run.errorMessage && (
                      <details>
                        <summary>Failure details</summary>
                        <pre>{safeRunErrorSummary(run.errorMessage)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
