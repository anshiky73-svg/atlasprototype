import { getCrawlerConfig } from "@/lib/config/crawler";
import { requireGeminiConfig } from "@/lib/config/env";
import { db } from "@/prisma/db";
import { discoverCandidates } from "@/lib/discovery/discovery-service";
import {
  saveContentSnapshot,
  upsertDiscoveredUrl,
} from "@/lib/discovery/repository";
import { getEnabledSeedSources } from "@/lib/discovery/source-registry";
import { findSeedSourceByDomain } from "@/lib/discovery/source-registry";
import type { SeedSource } from "@/lib/discovery/types/source";
import { crawlPage } from "./crawler";
import type { CrawlResult } from "./types";
import { classifyPage } from "@/lib/extraction/classifier";
import { buildSupportedExtraction } from "@/lib/extraction/evidence";
import { extractScholarship } from "@/lib/extraction/extractor";
import type { EvidenceField } from "@/lib/extraction/schema";
import { calculateConfidence } from "@/lib/verification/confidence";
import { CURRENT_INFORMATION_MAX_AGE_DAYS } from "@/lib/config/verification";
import { calculateScholarshipStatus } from "@/lib/status/status-engine";
import { hashContent } from "./hash";

const notSpecified = "Not specified";

function meaningful(value: string | null | undefined): value is string {
  return Boolean(value?.trim() && value.trim().toLowerCase() !== notSpecified.toLowerCase());
}

function toTimestamp(value: string): string | null {
  if (!meaningful(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function comparable(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("en-IN").replace(/\s+/g, " ");
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

function isSameOrSubdomain(hostname: string, domain: string): boolean {
  const host = normalizeDomain(hostname);
  const expected = normalizeDomain(domain);
  return Boolean(expected) && (host === expected || host.endsWith(`.${expected}`));
}

async function persistScholarship(
  input: {
    sourceId: number;
    sourceType: SeedSource["sourceType"];
    isOfficialSource: boolean;
    runId: number;
    page: CrawlResult;
    values: Omit<import("@/lib/extraction/schema").ExtractedScholarship, "evidence">;
    evidence: Array<{
      fieldName: EvidenceField;
      evidenceText: string;
      extractedValue: string;
      supportsClaim: boolean;
    }>;
    confidence: ReturnType<typeof calculateConfidence>;
  },
) {
  const sourceScholarships = await db.orm.public.Scholarship
    .where({ sourceId: input.sourceId })
    .all();
  const normalizedName = comparable(input.values["name"]);
  const normalizedProvider = comparable(input.values["provider"]);
  const existing = sourceScholarships.find(
    (scholarship) =>
      comparable(scholarship.name) === normalizedName &&
      comparable(scholarship.provider) === normalizedProvider,
  );

  const openingDate = toTimestamp(input.values.openingDate);
  const closingDate = toTimestamp(input.values.closingDate);
  const applicationUrl = input.values.applicationUrl;
  const fields = {
    name: input.values.name,
    provider: meaningful(input.values.provider) ? input.values.provider : null,
    amount: meaningful(input.values.amount) ? input.values.amount : null,
    eligibility: meaningful(input.values.eligibility) ? input.values.eligibility : null,
    academicRequirements: meaningful(input.values.academicRequirements) ? input.values.academicRequirements : null,
    educationLevel: meaningful(input.values.educationLevel) ? input.values.educationLevel : null,
    incomeCriteria: meaningful(input.values.incomeCriteria) ? input.values.incomeCriteria : null,
    ageCriteria: meaningful(input.values.ageCriteria) ? input.values.ageCriteria : null,
    genderCriteria: meaningful(input.values.genderCriteria) ? input.values.genderCriteria : null,
    categoryCriteria: meaningful(input.values.categoryCriteria) ? input.values.categoryCriteria : null,
    domicileCriteria: meaningful(input.values.domicileCriteria) ? input.values.domicileCriteria : null,
    institutionRequirements: meaningful(input.values.institutionRequirements) ? input.values.institutionRequirements : null,
    openingDate,
    closingDate,
    documentsRequired: meaningful(input.values.documentsRequired) ? input.values.documentsRequired : null,
    selectionProcess: meaningful(input.values.selectionProcess) ? input.values.selectionProcess : null,
    renewalRequirements: meaningful(input.values.renewalRequirements) ? input.values.renewalRequirements : null,
    applicationUrl: meaningful(applicationUrl) ? applicationUrl : null,
  };
  const verifiedAt = input.confidence.verificationStatus === "VERIFIED"
    ? input.page.retrievedAt
    : existing?.lastVerifiedAt ?? null;
  const status = calculateScholarshipStatus(
    closingDate ?? existing?.closingDate ?? notSpecified,
    input.confidence.verificationStatus,
    new Date(input.page.retrievedAt),
  );
  const persistedFields = {
    ...fields,
    provider: fields.provider ?? existing?.provider ?? null,
    amount: fields.amount ?? existing?.amount ?? null,
    eligibility: fields.eligibility ?? existing?.eligibility ?? null,
    academicRequirements: fields.academicRequirements ?? existing?.academicRequirements ?? null,
    educationLevel: fields.educationLevel ?? existing?.educationLevel ?? null,
    incomeCriteria: fields.incomeCriteria ?? existing?.incomeCriteria ?? null,
    ageCriteria: fields.ageCriteria ?? existing?.ageCriteria ?? null,
    genderCriteria: fields.genderCriteria ?? existing?.genderCriteria ?? null,
    categoryCriteria: fields.categoryCriteria ?? existing?.categoryCriteria ?? null,
    domicileCriteria: fields.domicileCriteria ?? existing?.domicileCriteria ?? null,
    institutionRequirements: fields.institutionRequirements ?? existing?.institutionRequirements ?? null,
    openingDate: openingDate ?? existing?.openingDate ?? null,
    closingDate: closingDate ?? existing?.closingDate ?? null,
    documentsRequired: fields.documentsRequired ?? existing?.documentsRequired ?? null,
    selectionProcess: fields.selectionProcess ?? existing?.selectionProcess ?? null,
    renewalRequirements: fields.renewalRequirements ?? existing?.renewalRequirements ?? null,
    applicationUrl: fields.applicationUrl ?? existing?.applicationUrl ?? null,
  };
  const recordValues = {
    ...persistedFields,
    sourceType: input.sourceType,
    officialSourceUrl: input.page.finalUrl,
    status,
    verificationStatus: input.confidence.verificationStatus,
    confidenceScore: input.confidence.score,
    confidenceBreakdown: JSON.stringify(input.confidence.breakdown),
    currentContentHash: input.page.contentHash,
    lastEvidenceHash: hashContent(JSON.stringify(input.evidence)),
    lastVerifiedAt: verifiedAt,
    lastCrawledAt: input.page.retrievedAt,
    sourceId: input.sourceId,
  };

  await db.transaction(async (tx) => {
    let id: number;
    if (existing) {
      id = existing.id;
      const changedFields: Array<[string, unknown, unknown, EvidenceField]> = [
        ["name", existing.name, fields.name, "NAME"],
        ["provider", existing.provider, fields.provider, "PROVIDER"],
        ["amount", existing.amount, fields.amount, "AMOUNT"],
        ["eligibility", existing.eligibility, fields.eligibility, "ELIGIBILITY"],
        ["academicRequirements", existing.academicRequirements, fields.academicRequirements, "ACADEMIC_REQUIREMENTS"],
        ["educationLevel", existing.educationLevel, fields.educationLevel, "EDUCATION_LEVEL"],
        ["incomeCriteria", existing.incomeCriteria, fields.incomeCriteria, "INCOME"],
        ["ageCriteria", existing.ageCriteria, fields.ageCriteria, "AGE"],
        ["genderCriteria", existing.genderCriteria, fields.genderCriteria, "GENDER"],
        ["categoryCriteria", existing.categoryCriteria, fields.categoryCriteria, "CATEGORY"],
        ["domicileCriteria", existing.domicileCriteria, fields.domicileCriteria, "DOMICILE"],
        ["institutionRequirements", existing.institutionRequirements, fields.institutionRequirements, "INSTITUTION"],
        ["openingDate", existing.openingDate, openingDate, "OPENING_DATE"],
        ["closingDate", existing.closingDate, closingDate, "CLOSING_DATE"],
        ["documentsRequired", existing.documentsRequired, fields.documentsRequired, "DOCUMENTS"],
        ["selectionProcess", existing.selectionProcess, fields.selectionProcess, "SELECTION_PROCESS"],
        ["renewalRequirements", existing.renewalRequirements, fields.renewalRequirements, "RENEWAL"],
        ["applicationUrl", existing.applicationUrl, fields.applicationUrl, "APPLICATION_URL"],
      ];
      for (const [fieldName, oldValue, newValue, evidenceField] of changedFields) {
        if (
          meaningful(String(oldValue ?? "")) &&
          meaningful(String(newValue ?? "")) &&
          comparable(oldValue) !== comparable(newValue)
        ) {
          const matchingEvidence = input.evidence.find(
            (item) => item.supportsClaim && item.fieldName === evidenceField,
          );
          await tx.orm.public.ChangeEvent.create({
            scholarshipId: id,
            crawlRunId: input.runId,
            fieldName,
            oldValue: String(oldValue),
            newValue: String(newValue),
            sourceUrl: input.page.finalUrl,
            evidenceText: matchingEvidence?.evidenceText ?? null,
            detectedAt: input.page.retrievedAt,
          });
        }
      }
      await tx.orm.public.Scholarship.where({ id }).update(recordValues);
    } else {
      const created = await tx.orm.public.Scholarship.create(recordValues);
      id = created.id;
    }

    await tx.orm.public.ScholarshipVersion.create({
      scholarshipId: id,
      crawlRunId: input.runId,
      ...fields,
      officialSourceUrl: input.page.finalUrl,
      confidenceScore: input.confidence.score,
      verificationStatus: input.confidence.verificationStatus,
      contentHash: input.page.contentHash,
      capturedAt: input.page.retrievedAt,
      sourceUrl: input.page.finalUrl,
    });

    for (const item of input.evidence) {
      await tx.orm.public.Evidence.create({
        scholarshipId: id,
        sourceId: input.sourceId,
        crawlRunId: input.runId,
        fieldName: item.fieldName,
        sourceUrl: input.page.finalUrl,
        evidenceText: item.evidenceText,
        extractedValue: item.extractedValue,
        contentHash: input.page.contentHash,
        retrievedAt: input.page.retrievedAt,
        supportsClaim: item.supportsClaim,
        isOfficialSource: input.isOfficialSource,
      });
    }
  });

  return {
    isNew: !existing,
    verificationStatus: input.confidence.verificationStatus,
    status,
  };
}

async function processPage(
  page: CrawlResult,
  sourceId: number,
  source: SeedSource,
  runId: number,
) {
  const sourceType = source.sourceType;
  const isOfficialSource = Boolean(source.isOfficial && source.isPrimarySource);
  const classification = classifyPage(page.title, page.finalUrl, page.text);
  if (classification !== "SCHOLARSHIP") {
    return { extracted: false, persisted: false, verified: false, isNew: false, status: null };
  }

  const extraction = await extractScholarship(page.title, page.text);
  const supported = buildSupportedExtraction(extraction, page.text);
  const values = supported.fields;

  const fieldConflicts = new Set<EvidenceField>();
  for (const item of supported.evidence) {
    if (!item.supportsClaim) continue;
    const other = supported.evidence.find(
      (candidate) =>
        candidate !== item &&
        candidate.fieldName === item.fieldName &&
        candidate.supportsClaim &&
        comparable(candidate.extractedValue) !== comparable(item.extractedValue),
    );
    if (other) fieldConflicts.add(item.fieldName);
  }
  const otherSourceRecords = await db.orm.public.Scholarship.all();
  for (const record of otherSourceRecords) {
    if (record.sourceId === sourceId || comparable(record.name) !== comparable(values.name)) continue;
    const comparedFields: Array<[EvidenceField, string | null, string | null]> = [
      ["AMOUNT", record.amount, meaningful(values.amount) ? values.amount : null],
      ["ELIGIBILITY", record.eligibility, meaningful(values.eligibility) ? values.eligibility : null],
      [
        "CLOSING_DATE",
        toTimestamp(record.closingDate ?? notSpecified),
        toTimestamp(values.closingDate),
      ],
      [
        "APPLICATION_URL",
        record.applicationUrl,
        meaningful(values.applicationUrl) ? values.applicationUrl : null,
      ],
    ];
    for (const [field, existingValue, extractedValue] of comparedFields) {
      if (
        meaningful(existingValue) &&
        meaningful(extractedValue) &&
        comparable(existingValue) !== comparable(extractedValue)
      ) {
        fieldConflicts.add(field);
      }
    }
  }

  const evidenceFor = (field: EvidenceField) =>
    supported.evidence.some((item) => item.fieldName === field && item.supportsClaim);
  const appUrl = values.applicationUrl;
  let officialApplicationUrl = false;
  if (meaningful(appUrl)) {
    try {
      const candidate = new URL(appUrl);
      const registeredSource = findSeedSourceByDomain(candidate.hostname);
      const belongsToCurrentPrimarySource =
        isOfficialSource && isSameOrSubdomain(candidate.hostname, source.domain);
      const belongsToRegisteredPrimarySource = Boolean(
        registeredSource?.isOfficial && registeredSource.isPrimarySource,
      );

      officialApplicationUrl =
        candidate.protocol === "https:" &&
        (belongsToCurrentPrimarySource || belongsToRegisteredPrimarySource) &&
        !fieldConflicts.has("APPLICATION_URL");
    } catch {
      values.applicationUrl = notSpecified;
    }
    if (!officialApplicationUrl) {
      values.applicationUrl = notSpecified;
      for (const item of supported.evidence) {
        if (item.fieldName === "APPLICATION_URL") item.supportsClaim = false;
      }
    }
  }

  const confidence = calculateConfidence({
    officialSource: isOfficialSource,
    existsOnOfficialSource: evidenceFor("NAME"),
    officialApplicationUrl,
    eligibilityEvidence: evidenceFor("ELIGIBILITY") && !fieldConflicts.has("ELIGIBILITY"),
    deadlineEvidence: evidenceFor("CLOSING_DATE") && !fieldConflicts.has("CLOSING_DATE"),
    amountEvidence: evidenceFor("AMOUNT") && !fieldConflicts.has("AMOUNT"),
    currentInformation:
      Date.now() - new Date(page.retrievedAt).getTime() <=
      CURRENT_INFORMATION_MAX_AGE_DAYS * 86_400_000,
    noConflicts: fieldConflicts.size === 0,
  });

  if (!meaningful(values.name)) {
    return { extracted: true, persisted: false, verified: false, isNew: false, status: null };
  }

  const result = await persistScholarship({
    sourceId,
    sourceType,
    isOfficialSource,
    runId,
    page,
    values,
    evidence: supported.evidence,
    confidence,
  });
  return {
    extracted: true,
    persisted: true,
    verified: result.verificationStatus === "VERIFIED",
    isNew: result.isNew,
    status: result.status,
  };
}

export async function runCrawl() {
  const crawlRun = await db.orm.public.CrawlRun.create({});
  let discoveredCount = 0;
  let crawledCount = 0;
  let extractedCount = 0;
  let verifiedCount = 0;
  let reviewRequiredCount = 0;
  let newScholarshipCount = 0;
  let updatedScholarshipCount = 0;
  let expiredCount = 0;
  let failedCount = 0;
  const failures: Array<{ url: string; message: string }> = [];

  try {
    requireGeminiConfig();
    const config = getCrawlerConfig();
    const discovery = await discoverCandidates();
    failures.push(...discovery.failures);
    const candidateRows = new Map<string, {
      id: number;
      contentHash: string | null;
      previousStatus: string;
    }>();
    for (const candidate of discovery.candidates) {
      const row = await upsertDiscoveredUrl({
        url: candidate.url,
        sourceId: candidate.sourceId,
        crawlRunId: crawlRun.id,
        discoveredFromUrl: candidate.discoveredFromUrl,
        discoveryMethod: candidate.discoveryMethod,
      });
      candidateRows.set(candidate.normalizedUrl, {
        id: row.id,
        contentHash: row.contentHash,
        previousStatus: row.previousStatus,
      });
      discoveredCount += 1;
    }

    const seedPages = new Map(discovery.seedPages.map(({ page }) => [page.requestedUrl, page]));
    const attemptedUrls = new Set(discovery.attemptedUrls);
    const failuresByUrl = new Map(
      discovery.failures.map((failure) => [failure.url, failure.message]),
    );
    for (const candidate of discovery.candidates) {
      if (!attemptedUrls.has(candidate.normalizedUrl)) continue;
      const message = failuresByUrl.get(candidate.normalizedUrl);
      if (!message) continue;
      const row = candidateRows.get(candidate.normalizedUrl);
      if (!row) continue;
      await db.orm.public.DiscoveredUrl.where({ id: row.id }).update({
        status: "FAILED",
        errorMessage: message.slice(0, 1_000),
      });
      await saveContentSnapshot({
        discoveredUrlId: row.id,
        crawlRunId: crawlRun.id,
        requestedUrl: candidate.url,
        finalUrl: candidate.url,
        httpStatus: null,
        contentHash: null,
        extractedText: null,
        retrievedAt: new Date().toISOString(),
        errorMessage: message.slice(0, 1_000),
      });
    }
    const cachedCandidates = discovery.candidates.filter((candidate) =>
      attemptedUrls.has(candidate.normalizedUrl) && seedPages.has(candidate.normalizedUrl)
    );
    const remainingBudget = Math.max(0, config.CRAWLER_MAX_PAGES_PER_RUN - discovery.pagesVisited);
    const additionalCandidates = discovery.candidates
      .filter((candidate) =>
        candidate.depth <= config.CRAWLER_MAX_DEPTH &&
        !attemptedUrls.has(candidate.normalizedUrl)
      )
      .slice(0, remainingBudget);
    const queue = [...cachedCandidates, ...additionalCandidates];
    const grouped = new Map<string, typeof queue>();
    for (const candidate of queue) {
      const group = grouped.get(candidate.source.domain) ?? [];
      group.push(candidate);
      grouped.set(candidate.source.domain, group);
    }

    for (const [domain, candidates] of grouped) {
      const verifiedBeforeDomain = verifiedCount;
      for (let start = 0; start < candidates.length; start += config.CRAWLER_CONCURRENCY_PER_DOMAIN) {
        const batch = candidates.slice(start, start + config.CRAWLER_CONCURRENCY_PER_DOMAIN);
        await Promise.all(batch.map(async (candidate) => {
          const row = candidateRows.get(candidate.normalizedUrl);
          if (!row) return;
          let page: CrawlResult | undefined = seedPages.get(candidate.normalizedUrl);
          let snapshotSaved = false;
          try {
            if (!page) page = await crawlPage(candidate.url);
            const previousHash = row.contentHash;

            await saveContentSnapshot({
              discoveredUrlId: row.id,
              crawlRunId: crawlRun.id,
              requestedUrl: page.requestedUrl,
              finalUrl: page.finalUrl,
              httpStatus: page.httpStatus,
              contentHash: page.contentHash,
              extractedText: page.text,
              retrievedAt: page.retrievedAt,
              errorMessage: null,
            });
            snapshotSaved = true;
            crawledCount += 1;
            await db.orm.public.DiscoveredUrl.where({ id: row.id }).update({
              status: "CRAWLED",
              crawlRunId: crawlRun.id,
              crawledAt: page.retrievedAt,
              httpStatus: page.httpStatus,
              contentHash: page.contentHash,
              errorMessage: null,
            });

            if (
              previousHash &&
              previousHash === page.contentHash &&
              row.previousStatus === "PROCESSED"
            ) {
              const unchangedRecords = await db.orm.public.Scholarship
                .where({ sourceId: candidate.sourceId })
                .all();
              for (const scholarship of unchangedRecords) {
                if (
                  scholarship.currentContentHash === page.contentHash &&
                  scholarship.officialSourceUrl === page.finalUrl
                ) {
                  const unchangedStatus = calculateScholarshipStatus(
                    scholarship.closingDate ?? notSpecified,
                    scholarship.verificationStatus,
                    new Date(page.retrievedAt),
                  );
                  await db.orm.public.Scholarship.where({ id: scholarship.id }).update({
                    lastCrawledAt: page.retrievedAt,
                    ...(scholarship.verificationStatus === "VERIFIED"
                      ? { lastVerifiedAt: page.retrievedAt }
                      : {}),
                    status: unchangedStatus,
                  });
                }
              }
              await db.orm.public.DiscoveredUrl.where({ id: row.id }).update({
                status: "PROCESSED",
                errorMessage: null,
              });
              return;
            }

            const result = await processPage(
              page,
              candidate.sourceId,
              candidate.source,
              crawlRun.id,
            );
            if (result.extracted) extractedCount += 1;
            if (result.persisted) {
              if (result.verified) verifiedCount += 1;
              else reviewRequiredCount += 1;
              if (result.isNew) newScholarshipCount += 1;
              else updatedScholarshipCount += 1;
            }
            if (result.status === "EXPIRED") expiredCount += 1;
            await db.orm.public.DiscoveredUrl.where({ id: row.id }).update({
              status: "PROCESSED",
              errorMessage: null,
            });
          } catch (error) {
            failedCount += 1;
            const message = error instanceof Error ? error.message : "Unknown crawl failure.";
            failures.push({ url: candidate.url, message });
            await db.orm.public.DiscoveredUrl.where({ id: row.id }).update({
              status: "FAILED",
              crawlRunId: crawlRun.id,
              errorMessage: message.slice(0, 1_000),
            });
            if (!snapshotSaved) {
              await saveContentSnapshot({
                discoveredUrlId: row.id,
                crawlRunId: crawlRun.id,
                requestedUrl: page?.requestedUrl ?? candidate.url,
                finalUrl: page?.finalUrl ?? candidate.url,
                httpStatus: page?.httpStatus ?? null,
                contentHash: page?.contentHash ?? null,
                extractedText: page?.text ?? null,
                retrievedAt: page?.retrievedAt ?? new Date().toISOString(),
                errorMessage: message.slice(0, 1_000),
              });
            }
          }
        }));
      }
      const source = getEnabledSeedSources().find((item) => item.domain === domain);
      const sourceId = discovery.sourceIds.get(domain);
      if (source && sourceId !== undefined) {
        await db.orm.public.Source.where({ id: sourceId }).update({
          lastCrawledAt: new Date().toISOString(),
          ...(verifiedCount > verifiedBeforeDomain ? { lastVerifiedAt: new Date().toISOString() } : {}),
        });
      }
    }

    await db.orm.public.CrawlRun.where({ id: crawlRun.id }).update({
      status: failures.length > 0 ? "FAILED" : "COMPLETED",
      completedAt: new Date().toISOString(),
      discoveredCount,
      crawledCount,
      extractedCount,
      verifiedCount,
      reviewRequiredCount,
      newScholarshipCount,
      updatedScholarshipCount,
      expiredCount,
      failedCount: failedCount + discovery.failures.length,
      errorMessage: failures.length > 0
        ? failures.slice(0, 5).map((item) => `${item.url}: ${item.message}`).join("\n").slice(0, 2_000)
        : null,
    });
    return {
      crawlRunId: crawlRun.id,
      status: failures.length > 0 ? "FAILED" : "COMPLETED",
      discoveredCount,
      crawledCount,
      extractedCount,
      verifiedCount,
      reviewRequiredCount,
      newScholarshipCount,
      updatedScholarshipCount,
      expiredCount,
      failedCount: failedCount + discovery.failures.length,
      failures: failures.slice(0, 20),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown crawl-run failure.";
    await db.orm.public.CrawlRun.where({ id: crawlRun.id }).update({
      status: "FAILED",
      completedAt: new Date().toISOString(),
      discoveredCount,
      crawledCount,
      extractedCount,
      verifiedCount,
      reviewRequiredCount,
      newScholarshipCount,
      updatedScholarshipCount,
      expiredCount,
      failedCount: failedCount + 1,
      errorMessage: message.slice(0, 2_000),
    });
    throw error;
  }
}
