import { SEED_SOURCES } from "./config/seed-sources";
import type { SeedSource } from "./types/source";

export function getEnabledSeedSources(): SeedSource[] {
  return SEED_SOURCES.filter((source) => source.enabled);
}

export function findSeedSourceByDomain(
  domain: string,
): SeedSource | undefined {
  const normalizedDomain = domain.toLowerCase();

  return SEED_SOURCES.find(
    (source) =>
      source.enabled &&
      (
        normalizedDomain === source.domain ||
        normalizedDomain.endsWith(`.${source.domain}`)
      ),
  );
}

export function isKnownOfficialDomain(domain: string): boolean {
  return Boolean(findSeedSourceByDomain(domain));
}