import type { SeedSource } from "./types/source";

import { db } from "@/prisma/db";

import { getDomain, normalizeUrl } from "./url";

function normalizeHttpUrl(value: string): string {
  const normalized = normalizeUrl(value);
  const parsed = new URL(normalized);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Unsupported URL protocol: ${parsed.protocol}`);
  }

  return normalized;
}

export async function ensureSource(source: SeedSource) {
  const normalizedSourceUrl = normalizeHttpUrl(source.url);
  const domain = getDomain(normalizedSourceUrl);

  const existing = await db.orm.public.Source.first({
    url: normalizedSourceUrl,
  });

  const values = {
    name: source.name,
    url: normalizedSourceUrl,
    // Derive the domain from the normalized URL unless the seed explicitly
    // provides a domain value (some source definitions may intentionally do so).
    domain: source.domain || domain,
    sourceType: source.sourceType,
    isOfficial: source.isOfficial,
    isPrimarySource: source.isPrimarySource,
    active: source.enabled,
  };

  if (existing) {
    await db.orm.public.Source.where({ id: existing.id }).update(values);

    return {
      ...existing,
      ...values,
    };
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
  const normalizedUrl = normalizeHttpUrl(input.url);
  const domain = getDomain(normalizedUrl);
  const discoveredFromUrl = input.discoveredFromUrl
    ? normalizeHttpUrl(input.discoveredFromUrl)
    : null;

  const existing = await db.orm.public.DiscoveredUrl.first({
    normalizedUrl,
  });

  const previousStatus = existing?.status ?? "DISCOVERED";

  const values = {
    url: normalizedUrl,
    normalizedUrl,
    domain,
    sourceId: input.sourceId,
    crawlRunId: input.crawlRunId,
    status: "QUEUED" as const,
    discoveredFromUrl,
    discoveryMethod: input.discoveryMethod,
    lastSeenAt: new Date().toISOString(),
  };

  if (existing) {
    await db.orm.public.DiscoveredUrl.where({ id: existing.id }).update(values);

    return {
      ...existing,
      ...values,
      previousStatus,
    };
  }

  return {
    ...(await db.orm.public.DiscoveredUrl.create(values)),
    previousStatus,
  };
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
  const requestedUrl = normalizeHttpUrl(input.requestedUrl);
  const finalUrl = normalizeHttpUrl(input.finalUrl);

  return db.orm.public.ContentSnapshot.create({
    ...input,
    requestedUrl,
    finalUrl,
  });
}
