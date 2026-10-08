export const CONFIDENCE_WEIGHTS = {
  officialSource: 25,
  existsOnOfficialSource: 20,
  officialApplicationUrl: 10,
  eligibilityEvidence: 15,
  deadlineEvidence: 10,
  amountEvidence: 5,
  currentInformation: 10,
  noConflicts: 5,
} as const;

export const VERIFIED_THRESHOLD = 95;
export const CURRENT_INFORMATION_MAX_AGE_DAYS = 30;
