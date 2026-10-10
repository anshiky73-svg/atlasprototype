import { db } from "@/prisma/db";

export type ScholarshipQueryOptions = {
  query?: string;
  status?: string;
};

function normalizeSearchValue(value: string): string {
  return value.trim().toLocaleLowerCase("en-IN");
}

export async function getDashboardData() {
  const [
    totalDiscovered,
    totalScholarships,
    verified,
    reviewRequired,
    active,
    expired,
    averageConfidence,
    recentScholarships,
    latestRun,
  ] = await Promise.all([
    db.orm.public.DiscoveredUrl.aggregate((aggregate) => ({
      count: aggregate.count(),
    })),
    db.orm.public.Scholarship.aggregate((aggregate) => ({
      count: aggregate.count(),
    })),
    db.orm.public.Scholarship
      .where({ verificationStatus: "VERIFIED" })
      .aggregate((aggregate) => ({ count: aggregate.count() })),
    db.orm.public.Scholarship
      .where({ verificationStatus: "REVIEW_REQUIRED" })
      .aggregate((aggregate) => ({ count: aggregate.count() })),
    db.orm.public.Scholarship
      .where({ status: "ACTIVE" })
      .aggregate((aggregate) => ({ count: aggregate.count() })),
    db.orm.public.Scholarship
      .where({ status: "EXPIRED" })
      .aggregate((aggregate) => ({ count: aggregate.count() })),
    db.orm.public.Scholarship.aggregate((aggregate) => ({
      average: aggregate.avg("confidenceScore"),
    })),
    db.orm.public.Scholarship
      .orderBy((scholarship) => scholarship.updatedAt.desc())
      .limit(5)
      .all(),
    db.orm.public.CrawlRun
      .orderBy((run) => run.startedAt.desc())
      .first(),
  ]);

  return {
    totalDiscovered: totalDiscovered.count,
    totalScholarships: totalScholarships.count,
    verified: verified.count,
    reviewRequired: reviewRequired.count,
    active: active.count,
    expired: expired.count,
    averageConfidence: averageConfidence.average ?? 0,
    recentScholarships,
    latestRun,
  };
}

export async function getScholarships(
  query = "",
  status = "",
): Promise<
  Array<{
    id: number;
    name: string;
    provider: string | null;
    officialSourceUrl: string;
    applicationUrl: string | null;
    sourceType: string;
    eligibility: string | null;
    academicRequirements: string | null;
    educationLevel: string | null;
    domicileCriteria: string | null;
    categoryCriteria: string | null;
    institutionRequirements: string | null;
    closingDate: string | null;
    confidenceScore: number;
    status: string;
    verificationStatus: string;
    updatedAt: string;
  }>
> {
  const rows = await db.orm.public.Scholarship
    .orderBy((scholarship) => scholarship.updatedAt.desc())
    .limit(1_000)
    .all();

  const normalizedQuery = normalizeSearchValue(query);
  const normalizedStatus = status.trim().toLocaleUpperCase("en-IN");

  return rows.filter((scholarship) => {
    const searchableValues = [
      scholarship.name,
      scholarship.provider ?? "",
      scholarship.eligibility ?? "",
      scholarship.academicRequirements ?? "",
      scholarship.educationLevel ?? "",
      scholarship.domicileCriteria ?? "",
      scholarship.categoryCriteria ?? "",
      scholarship.institutionRequirements ?? "",
      scholarship.sourceType,
      scholarship.officialSourceUrl,
      scholarship.applicationUrl ?? "",
    ];

    const matchesQuery =
      !normalizedQuery ||
      searchableValues.some((value) =>
        normalizeSearchValue(value).includes(normalizedQuery),
      );

    return (
      matchesQuery &&
      (!normalizedStatus ||
        scholarship.status === normalizedStatus ||
        scholarship.verificationStatus === normalizedStatus)
    );
  });
}

export async function getScholarshipDetail(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) {
    return { scholarship: null, evidence: [], changes: [], versions: [] };
  }

  const [scholarship, evidence, changes, versions] = await Promise.all([
    db.orm.public.Scholarship.first({ id }),
    db.orm.public.Evidence
      .where({ scholarshipId: id })
      .orderBy((item) => item.retrievedAt.desc())
      .limit(100)
      .all(),
    db.orm.public.ChangeEvent
      .where({ scholarshipId: id })
      .orderBy((item) => item.detectedAt.desc())
      .limit(100)
      .all(),
    db.orm.public.ScholarshipVersion
      .where({ scholarshipId: id })
      .orderBy((item) => item.capturedAt.desc())
      .limit(30)
      .all(),
  ]);

  return { scholarship, evidence, changes, versions };
}

export async function getSources() {
  return db.orm.public.Source
    .orderBy((source) => source.name.asc())
    .all();
}

export async function getCrawlRuns() {
  return db.orm.public.CrawlRun
    .orderBy((run) => run.startedAt.desc())
    .limit(50)
    .all();
}
