import { getCrawlerConfig } from "@/lib/config/crawler";

export type ScholarshipStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "REVIEW_REQUIRED"
  | "NO_LONGER_VERIFIABLE";

export function calculateScholarshipStatus(
  closingDate: string,
  verificationStatus: "VERIFIED" | "REVIEW_REQUIRED" | "FAILED",
  today = new Date(),
): ScholarshipStatus {
  if (verificationStatus !== "VERIFIED") return "REVIEW_REQUIRED";
  if (closingDate && closingDate !== "Not specified") {
    const parsedDate = new Date(closingDate);
    if (!Number.isNaN(parsedDate.getTime())) {
      const daysRemaining = Math.ceil((parsedDate.getTime() - today.getTime()) / 86_400_000);
      if (daysRemaining < 0) return "EXPIRED";
      if (daysRemaining <= getCrawlerConfig().EXPIRING_SOON_DAYS) return "EXPIRING_SOON";
    }
  }
  return "ACTIVE";
}
