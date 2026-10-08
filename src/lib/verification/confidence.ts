import { CONFIDENCE_WEIGHTS, VERIFIED_THRESHOLD } from "@/lib/config/verification";

export interface ConfidenceEvidence {
  officialSource: boolean;
  existsOnOfficialSource: boolean;
  officialApplicationUrl: boolean;
  eligibilityEvidence: boolean;
  deadlineEvidence: boolean;
  amountEvidence: boolean;
  currentInformation: boolean;
  noConflicts: boolean;
}

export function calculateConfidence(evidence: ConfidenceEvidence) {
  const breakdown = Object.fromEntries(
    Object.entries(CONFIDENCE_WEIGHTS).map(([key, points]) => [
      key,
      evidence[key as keyof ConfidenceEvidence] ? points : 0,
    ]),
  ) as Record<keyof ConfidenceEvidence, number>;
  const score = Object.values(breakdown).reduce((total, value) => total + value, 0);
  return {
    score,
    breakdown: { ...breakdown, total: score },
    verificationStatus:
      score >= VERIFIED_THRESHOLD && evidence.noConflicts
        ? "VERIFIED" as const
        : "REVIEW_REQUIRED" as const,
  };
}
