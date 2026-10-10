import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { getScholarshipDetail } from "@/features/scholarship-intelligence";
import { hasDatabaseConfig } from "@/lib/config/env";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function display(value: string | null) {
  return value?.trim() || "Not specified";
}

function scoreBreakdown(raw: string | null): Record<string, number> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] =>
        typeof entry[1] === "number",
      ),
    );
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id: rawId } = await params;
  if (!hasDatabaseConfig()) return { title: "Scholarship" };
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) return { title: "Scholarship" };
  const { scholarship } = await getScholarshipDetail(id);
  return { title: scholarship?.name ?? "Scholarship" };
}

export default async function ScholarshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!hasDatabaseConfig()) {
    return (
      <div className="page-wrap">
        <section className="setup-banner"><span className="setup-icon">i</span><div><h2>Database not connected</h2><p>Configure DATABASE_URL to view scholarship details and evidence.</p></div></section>
      </div>
    );
  }
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) notFound();
  const { scholarship, evidence, changes, versions } = await getScholarshipDetail(id);
  if (!scholarship) notFound();

  const breakdown = scoreBreakdown(scholarship.confidenceBreakdown);
  const points = [
    ["officialSource", "Official source"],
    ["existsOnOfficialSource", "Award found on official source"],
    ["officialApplicationUrl", "Official application URL"],
    ["eligibilityEvidence", "Eligibility evidence"],
    ["deadlineEvidence", "Deadline evidence"],
    ["amountEvidence", "Amount evidence"],
    ["currentInformation", "Current information"],
    ["noConflicts", "No conflicting evidence"],
  ];
  const attributes = [
    ["Amount / benefit", scholarship.amount],
    ["Eligibility", scholarship.eligibility],
    ["Academic requirements", scholarship.academicRequirements],
    ["Education level", scholarship.educationLevel],
    ["Income criteria", scholarship.incomeCriteria],
    ["Age criteria", scholarship.ageCriteria],
    ["Gender criteria", scholarship.genderCriteria],
    ["Category", scholarship.categoryCriteria],
    ["Domicile", scholarship.domicileCriteria],
    ["Institution requirements", scholarship.institutionRequirements],
    ["Opening date", scholarship.openingDate ? formatDate(scholarship.openingDate) : null],
    ["Closing date", scholarship.closingDate ? formatDate(scholarship.closingDate) : null],
    ["Documents required", scholarship.documentsRequired],
    ["Selection process", scholarship.selectionProcess],
    ["Renewal requirements", scholarship.renewalRequirements],
  ];

  return (
    <div className="page-wrap">
      <div className="back-row"><Link href="/scholarships">← All scholarships</Link></div>
      <section className="detail-heading">
        <div>
          <span className="eyebrow">{scholarship.sourceType.replaceAll("_", " ")} · OFFICIAL SOURCE</span>
          <h1>{scholarship.name}</h1>
          <p className="page-description">{display(scholarship.provider)}</p>
        </div>
        <div className="detail-status">
          <StatusBadge value={scholarship.status} />
          <StatusBadge value={scholarship.verificationStatus} />
        </div>
      </section>

      <div className="detail-grid">
        <div className="detail-main-column">
          <section className="section-card">
            <div className="section-heading compact-heading">
              <div><span className="eyebrow">PROGRAM DETAILS</span><h2>Eligibility and benefits</h2></div>
            </div>
            <div className="attribute-grid">
              {attributes.map(([label, value]) => (
                <div className="attribute-item" key={label}>
                  <span>{label}</span><p>{display(value as string | null)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="section-card">
            <div className="section-heading compact-heading">
              <div><span className="eyebrow">FIELD-LEVEL PROOF</span><h2>Source evidence <span className="heading-count">{evidence.length}</span></h2></div>
            </div>
            {evidence.length === 0 ? (
              <div className="empty-state small-empty"><h3>No evidence records</h3><p>Evidence is captured when the page is successfully extracted.</p></div>
            ) : (
              <div className="evidence-list">
                {evidence.map((item) => (
                  <article className="evidence-item" key={item.id}>
                    <div className="evidence-topline">
                      <strong>{item.fieldName.replaceAll("_", " ")}</strong>
                      <span className={item.supportsClaim ? "support-label" : "unsupported-label"}>
                        {item.supportsClaim ? "Supports claim" : "Not verified"}
                      </span>
                    </div>
                    <blockquote>“{item.evidenceText}”</blockquote>
                    <div className="evidence-value"><span>Extracted value</span><strong>{display(item.extractedValue)}</strong></div>
                    <div className="evidence-source">
                      <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source page ↗</a>
                      <span>{formatDate(item.retrievedAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="detail-side-column">
          <section className="section-card confidence-card">
            <span className="eyebrow">DETERMINISTIC SCORE</span>
            <div className="confidence-number">{scholarship.confidenceScore}<span>/100</span></div>
            <p className="confidence-caption">A score of 95 or higher is required for verified status.</p>
            {breakdown ? (
              <div className="score-breakdown">
                {points.map(([key, label]) => (
                  <div className="score-line" key={key}>
                    <span>{label}</span>
                    <strong>{breakdown[key] ?? 0}</strong>
                  </div>
                ))}
                <div className="score-line score-total"><span>Total</span><strong>{breakdown.total ?? scholarship.confidenceScore}</strong></div>
              </div>
            ) : <p className="data-warning">Score breakdown is unavailable or invalid.</p>}
          </section>
          <section className="section-card source-detail-card">
            <span className="eyebrow">PRIMARY SOURCE</span>
            <a className="source-url" href={scholarship.officialSourceUrl} target="_blank" rel="noreferrer">
              {scholarship.officialSourceUrl} ↗
            </a>
            <span className="eyebrow application-eyebrow">APPLICATION</span>
            {scholarship.applicationUrl ? (
              <a className="button button-primary full-button" href={scholarship.applicationUrl} target="_blank" rel="noreferrer">Visit application page ↗</a>
            ) : <p className="muted-copy">No official application link specified.</p>}
            <div className="verified-at">Last crawled {formatDate(scholarship.lastCrawledAt)}</div>
            <div className="verified-at">Last verified {formatDate(scholarship.lastVerifiedAt)}</div>
          </section>
          <section className="section-card history-card">
            <div className="section-heading compact-heading">
              <div><span className="eyebrow">CHANGE DETECTION</span><h2>History <span className="heading-count">{changes.length}</span></h2></div>
            </div>
            {changes.length === 0 ? (
              <p className="muted-copy">No material changes recorded yet.</p>
            ) : (
              <div className="change-list">
                {changes.map((change) => (
                  <article className="change-item" key={change.id}>
                    <span className="change-date">{formatDate(change.detectedAt)}</span>
                    <strong>{change.fieldName.replaceAll("_", " ")}</strong>
                    <p><del>{display(change.oldValue)}</del><span> → </span>{display(change.newValue)}</p>
                    {change.evidenceText && <blockquote>“{change.evidenceText}”</blockquote>}
                  </article>
                ))}
              </div>
            )}
            <div className="version-count">{versions.length} preserved snapshots</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
