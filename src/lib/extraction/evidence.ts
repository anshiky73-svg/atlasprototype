import type { ExtractedScholarship, EvidenceField } from "./schema";

type ScholarshipValueField = keyof Omit<ExtractedScholarship, "evidence">;

const fieldMap = {
  NAME: "name",
  PROVIDER: "provider",
  AMOUNT: "amount",
  ELIGIBILITY: "eligibility",
  ACADEMIC_REQUIREMENTS: "academicRequirements",
  EDUCATION_LEVEL: "educationLevel",
  INCOME: "incomeCriteria",
  AGE: "ageCriteria",
  GENDER: "genderCriteria",
  CATEGORY: "categoryCriteria",
  DOMICILE: "domicileCriteria",
  INSTITUTION: "institutionRequirements",
  OPENING_DATE: "openingDate",
  CLOSING_DATE: "closingDate",
  DOCUMENTS: "documentsRequired",
  SELECTION_PROCESS: "selectionProcess",
  RENEWAL: "renewalRequirements",
  APPLICATION_URL: "applicationUrl",
} as const satisfies Record<EvidenceField, ScholarshipValueField>;

export interface BuiltEvidence {
  fieldName: EvidenceField;
  evidenceText: string;
  extractedValue: string;
  supportsClaim: boolean;
}

function normalizeForComparison(value: string): string {
  return value.toLocaleLowerCase("en-IN").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function buildSupportedExtraction(
  extraction: ExtractedScholarship,
  pageText: string,
): { fields: Omit<ExtractedScholarship, "evidence">; evidence: BuiltEvidence[] } {
  const { evidence: extractedEvidence, ...fields } = extraction;
  const normalizedPage = normalizeForComparison(pageText);
  const evidence: BuiltEvidence[] = [];

  for (const item of extractedEvidence) {
    const fieldKey = fieldMap[item.field];
    const value = extraction[fieldKey];
    if (!value.trim() || value.trim().toLowerCase() === "not specified") continue;
    const normalizedQuote = normalizeForComparison(item.quote);
    const normalizedValue = normalizeForComparison(value);
    const quoteIsPresent = normalizedQuote.length >= 12 && normalizedPage.includes(normalizedQuote);
    const valueIsInQuote = ` ${normalizedQuote} `.includes(` ${normalizedValue} `);
    const supportsClaim = quoteIsPresent && valueIsInQuote;
    evidence.push({
      fieldName: item.field,
      evidenceText: item.quote,
      extractedValue: value,
      supportsClaim,
    });
    if (!supportsClaim) fields[fieldKey] = "Not specified";
  }

  for (const [fieldName, fieldKey] of Object.entries(fieldMap) as [EvidenceField, ScholarshipValueField][]) {
    const value = fields[fieldKey];
    if (value !== "Not specified" && !evidence.some((item) => item.fieldName === fieldName && item.supportsClaim)) {
      fields[fieldKey] = "Not specified";
    }
  }

  return { fields, evidence };
}
