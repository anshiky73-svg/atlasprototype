import Link from "next/link";
import type { getScholarships } from "@/lib/data/scholarships";
import { StatusBadge } from "./status-badge";

type Scholarship = Awaited<ReturnType<typeof getScholarships>>[number];

function formatDate(value: string | null) {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function ScholarshipTable({ scholarships }: { scholarships: Scholarship[] }) {
  if (scholarships.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">S</span>
        <h3>No scholarships found</h3>
        <p>Try another search, or run the crawler to discover official opportunities.</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="scholarship-table">
        <thead>
          <tr>
            <th>Scholarship</th>
            <th>Provider</th>
            <th>Deadline</th>
            <th>Confidence</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {scholarships.map((scholarship) => (
            <tr key={scholarship.id}>
              <td>
                <Link className="scholarship-name" href={`/scholarships/${scholarship.id}`}>
                  {scholarship.name}
                </Link>
                <span className="table-subtitle">{scholarship.sourceType.replaceAll("_", " ")}</span>
              </td>
              <td>{scholarship.provider || "Not specified"}</td>
              <td>{formatDate(scholarship.closingDate)}</td>
              <td>
                <span className="score-value">{scholarship.confidenceScore}</span>
                <span className="score-out-of"> / 100</span>
              </td>
              <td><StatusBadge value={scholarship.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
