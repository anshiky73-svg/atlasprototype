import { z } from "zod";

export const evidenceFields = [
  "NAME",
  "PROVIDER",
  "AMOUNT",
  "ELIGIBILITY",
  "ACADEMIC_REQUIREMENTS",
  "EDUCATION_LEVEL",
  "INCOME",
  "AGE",
  "GENDER",
  "CATEGORY",
  "DOMICILE",
  "INSTITUTION",
  "OPENING_DATE",
  "CLOSING_DATE",
  "DOCUMENTS",
  "SELECTION_PROCESS",
  "RENEWAL",
  "APPLICATION_URL",
] as const;

export const extractedScholarshipSchema = z.object({
  name: z.string().min(1),
  provider: z.string(),
  amount: z.string(),
  eligibility: z.string(),
  academicRequirements: z.string(),
  educationLevel: z.string(),
  incomeCriteria: z.string(),
  ageCriteria: z.string(),
  genderCriteria: z.string(),
  categoryCriteria: z.string(),
  domicileCriteria: z.string(),
  institutionRequirements: z.string(),
  openingDate: z.string(),
  closingDate: z.string(),
  documentsRequired: z.string(),
  selectionProcess: z.string(),
  renewalRequirements: z.string(),
  applicationUrl: z.string(),
  evidence: z.array(z.object({
    field: z.enum(evidenceFields),
    quote: z.string().min(1),
  })),
}).strict();

export type ExtractedScholarship = z.infer<typeof extractedScholarshipSchema>;
export type EvidenceField = typeof evidenceFields[number];
