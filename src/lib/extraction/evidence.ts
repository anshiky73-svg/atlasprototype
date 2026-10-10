import type { ExtractedScholarship, EvidenceField } from "./schema";

type ScholarshipValueField = keyof Omit<ExtractedScholarship, "evidence">;

const NOT_SPECIFIED = "Not specified";
const MINIMUM_QUOTE_LENGTH = 12;

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
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-IN")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isSpecified(value: string): boolean {
  return Boolean(
    value.trim() &&
      value.trim().toLocaleLowerCase("en-IN") !==
        NOT_SPECIFIED.toLocaleLowerCase("en-IN"),
  );
}

function quoteAppearsInSource(quote: string, normalizedPage: string): boolean {
  const normalizedQuote = normalizeForComparison(quote);

  return (
    normalizedQuote.length >= MINIMUM_QUOTE_LENGTH &&
    normalizedPage.includes(normalizedQuote)
  );
}

function valueIsSupportedByQuote(value: string, quote: string): boolean {
  const normalizedValue = normalizeForComparison(value);
  const normalizedQuote = normalizeForComparison(quote);

  if (!normalizedValue || !normalizedQuote) {
    return false;
  }

  // Require the normalized value to appear as a contiguous phrase. This
  // prevents a quote containing the same words in a different order from
  // being accepted as support.
  return ` ${normalizedQuote} `.includes(` ${normalizedValue} `);
}

export function buildSupportedExtraction(
  extraction: ExtractedScholarship,
  pageText: string,
): {
  fields: Omit<ExtractedScholarship, "evidence">;
  evidence: BuiltEvidence[];
} {
  const { evidence: extractedEvidence, ...extractedFields } = extraction;

  // Work on a copy; do not mutate the parsed model response.
  const fields: Omit<ExtractedScholarship, "evidence"> = {
    ...extractedFields,
  };

  const normalizedPage = normalizeForComparison(pageText);
  const evidence: BuiltEvidence[] = [];

  for (const item of extractedEvidence) {
    const fieldKey = fieldMap[item.field];
    const value = fields[fieldKey];

    if (!isSpecified(value)) {
      continue;
    }

    const quoteIsPresent = quoteAppearsInSource(item.quote, normalizedPage);
    const valueIsInQuote = valueIsSupportedByQuote(value, item.quote);
    const supportsClaim = quoteIsPresent && valueIsInQuote;

    evidence.push({
      fieldName: item.field,
      evidenceText: item.quote,
      extractedValue: value,
      supportsClaim,
    });

    // Fail closed: an unsupported value must not be saved as a fact.
    if (!supportsClaim) {
      fields[fieldKey] = NOT_SPECIFIED;
    }
  }

  // Also reject fields for which the model supplied no valid evidence quote.
  for (const [fieldName, fieldKey] of Object.entries(fieldMap) as [
    EvidenceField,
    ScholarshipValueField,
  ][]) {
    const value = fields[fieldKey];

    if (
      isSpecified(value) &&
      !evidence.some(
        (item) =>
          item.fieldName === fieldName &&
          item.supportsClaim &&
          normalizeForComparison(item.extractedValue) ===
            normalizeForComparison(value),
      )
    ) {
      fields[fieldKey] = NOT_SPECIFIED;
    }
  }

  return { fields, evidence };
}
