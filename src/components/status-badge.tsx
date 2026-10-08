const labels: Record<string, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  REVIEW_REQUIRED: "Review required",
  NO_LONGER_VERIFIABLE: "Unverifiable",
  VERIFIED: "Verified",
  FAILED: "Failed",
  COMPLETED: "Completed",
  RUNNING: "Running",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      <span className="badge-dot" />
      {labels[value] ?? value.replaceAll("_", " ")}
    </span>
  );
}
