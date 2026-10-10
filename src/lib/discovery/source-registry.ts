import { SEED_SOURCES } from "./config/seed-sources";
import type { SeedSource } from "./types/source";

function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");
}

export function getEnabledSeedSources(): SeedSource[] {
  return SEED_SOURCES.filter((source) => source.enabled);
}

export function findSeedSourceByDomain(
  domain: string,
): SeedSource | undefined {
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    return undefined;
  }

  return SEED_SOURCES.find((source) => {
    if (!source.enabled) {
      return false;
    }

    const sourceDomains = [source.domain, ...(source.aliases ?? [])]
      .map(normalizeDomain)
      .filter(Boolean);

    return sourceDomains.some((sourceDomain) =>
      normalizedDomain === sourceDomain ||
      normalizedDomain.endsWith(`.${sourceDomain}`),
    );
  });
}

export function isKnownOfficialDomain(domain: string): boolean {
  const source = findSeedSourceByDomain(domain);

  return Boolean(source?.isOfficial && source.isPrimarySource);
}
