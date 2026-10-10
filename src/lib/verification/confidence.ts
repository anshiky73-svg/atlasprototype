import { CONFIDENCE_WEIGHTS, VERIFIED_THRESHOLD } from "@/lib/config/verification";

export interface ConfidenceEvidence {
  /** The page belongs to a registered, trusted primary source for this record. */
  officialSource: boolean;
  /** The scholarship's identity is directly supported by evidence on that source. */
  existsOnOfficialSource: boolean;
  /** The application URL has been checked against the provider/source policy. */
  officialApplicationUrl: boolean;
  eligibilityEvidence: boolean;
  deadlineEvidence: boolean;
  amountEvidence: boolean;
  currentInformation: boolean;
  noConflicts: boolean;
}

export type VerificationStatus = "VERIFIED" | "REVIEW_REQUIRED";

export interface ConfidenceResult {
  score: number;
  breakdown: Record<keyof ConfidenceEvidence, number> & { total: number };
  verificationStatus: VerificationStatus;
}

export function calculateConfidence(
  evidence: ConfidenceEvidence,
): ConfidenceResult {
  const breakdown = Object.fromEntries(
    Object.entries(CONFIDENCE_WEIGHTS).map(([key, points]) => [
      key,
      evidence[key as keyof ConfidenceEvidence] ? points : 0,
    ]),
  ) as Record<keyof ConfidenceEvidence, number>;

  const score = Object.values(breakdown).reduce(
    (total, value) => total + value,
    0,
  );

  // A high score alone must not mark a record verified. The scholarship's
  // existence, trusted primary-source provenance, and absence of conflicting
  // evidence are mandatory. The caller must determine source trust from
  // registered provider metadata, not from the URL's appearance alone.
  const hasCoreEvidence =
    evidence.eligibilityEvidence ||
    evidence.deadlineEvidence ||
    evidence.amountEvidence;

  const mandatoryChecksPass =
    evidence.officialSource &&
    evidence.existsOnOfficialSource &&
    evidence.noConflicts &&
    hasCoreEvidence;

  return {
    score,
    breakdown: { ...breakdown, total: score },
    verificationStatus:
      score >= VERIFIED_THRESHOLD && mandatoryChecksPass
        ? "VERIFIED"
        : "REVIEW_REQUIRED",
  };
}
