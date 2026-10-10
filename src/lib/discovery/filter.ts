import type { SeedSource } from "./types/source";

import { isHttpUrl, normalizeUrl } from "./url";

const unsupportedFileExtensions =
  /\.(?:pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|gz|tar|csv|json|xml|jpg|jpeg|png|gif|webp|svg|mp3|mp4|mov|avi)(?:$|[?#])/i;

const urlPathBlacklist =
  /(?:^|\/)(?:login|register|signup|sign-in|contact|privacy|terms|cookies|download|downloads|assets|media|static|api|logout|forgot-password)(?:\/|$)/i;

function matchesPattern(url: string, patterns: string[] = []): boolean {
  const normalized = url.toLowerCase();

  return patterns.some((pattern) => {
    const normalizedPattern = pattern.trim().toLowerCase();

    return normalizedPattern.length > 0 && normalized.includes(normalizedPattern);
  });
}

/**
 * Returns whether a discovered URL is a useful candidate for crawling.
 *
 * This is a discovery filter, not an authenticity check: URLs that pass still
 * need to be fetched, classified, extracted, and verified against their source.
 */
export function shouldDiscoverUrl(url: string, source: SeedSource): boolean {
  if (!isHttpUrl(url)) {
    return false;
  }

  let normalizedUrl: string;

  try {
    normalizedUrl = normalizeUrl(url);

    const parsedUrl = new URL(normalizedUrl);

    // Filter file extensions using the pathname only, so query-string values
    // and fragments do not cause an otherwise valid HTML page to be rejected.
    if (unsupportedFileExtensions.test(parsedUrl.pathname)) {
      return false;
    }

    // Match complete path segments rather than arbitrary substrings. For
    // example, "/scholarship-login-help" should not be rejected just because
    // it contains the word "login".
    if (urlPathBlacklist.test(parsedUrl.pathname)) {
      return false;
    }
  } catch {
    return false;
  }

  if (matchesPattern(normalizedUrl, source.excludePatterns)) {
    return false;
  }

  if (!source.includePatterns?.length) {
    return true;
  }

  return matchesPattern(normalizedUrl, source.includePatterns);
}
