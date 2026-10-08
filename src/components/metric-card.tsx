export function MetricCard({
  label,
  value,
  detail,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  detail: string;
  accent?: "blue" | "green" | "amber" | "violet";
}) {
  return (
    <article className={`metric-card metric-${accent}`}>
      <div className="metric-topline">
        <span className="metric-label">{label}</span>
        <span className="metric-mark" />
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}
