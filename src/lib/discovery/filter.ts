import type { SeedSource } from "./types/source";
import { isHttpUrl, normalizeUrl } from "./url";

function matchesPattern(
  url: string,
  patterns: string[] = [],
): boolean {
  const normalized = url.toLowerCase();

  return patterns.some((pattern) =>
    normalized.includes(pattern.toLowerCase()),
  );
}

export function shouldDiscoverUrl(
  url: string,
  source: SeedSource,
): boolean {
  if (!isHttpUrl(url)) {
    return false;
  }

  const normalizedUrl = normalizeUrl(url);

  if (matchesPattern(normalizedUrl, source.excludePatterns)) {
    return false;
  }

  if (!source.includePatterns?.length) {
    return true;
  }

  return matchesPattern(normalizedUrl, source.includePatterns);
}