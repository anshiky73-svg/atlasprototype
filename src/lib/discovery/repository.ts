import type { SeedSource } from "./types/source";
import { db } from "@/prisma/db";
import { getDomain, normalizeUrl } from "./url";

export async function ensureSource(source: SeedSource) {
  const existing = await db.orm.public.Source.first({ url: source.url });
  const values = {
    name: source.name,
    url: source.url,
    domain: source.domain,
    sourceType: source.sourceType,
    isOfficial: source.isOfficial,
    isPrimarySource: source.isPrimarySource,
    active: source.enabled,
  };

  if (existing) {
    await db.orm.public.Source.where({ id: existing.id }).update(values);
    return { ...existing, ...values };
  }
  return db.orm.public.Source.create(values);
}

export async function upsertDiscoveredUrl(input: {
  url: string;
  sourceId: number;
  crawlRunId: number;
  discoveredFromUrl: string | null;
  discoveryMethod: string;
}) {
  const normalizedUrl = normalizeUrl(input.url);
  const domain = getDomain(normalizedUrl);
  const existing = await db.orm.public.DiscoveredUrl.first({ normalizedUrl });
  const previousStatus = existing?.status ?? "DISCOVERED";
  const values = {
    url: normalizedUrl,
    normalizedUrl,
    domain,
    sourceId: input.sourceId,
    crawlRunId: input.crawlRunId,
    status: "QUEUED" as const,
    discoveredFromUrl: input.discoveredFromUrl,
    discoveryMethod: input.discoveryMethod,
    lastSeenAt: new Date().toISOString(),
  };

  if (existing) {
    await db.orm.public.DiscoveredUrl.where({ id: existing.id }).update(values);
    return { ...existing, ...values, previousStatus };
  }
  return { ...(await db.orm.public.DiscoveredUrl.create(values)), previousStatus };
}

export async function saveContentSnapshot(input: {
  discoveredUrlId: number;
  crawlRunId: number;
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number | null;
  contentHash: string | null;
  extractedText: string | null;
  retrievedAt: string;
  errorMessage: string | null;
}) {
  return db.orm.public.ContentSnapshot.create(input);
}
