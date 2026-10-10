import { load } from "cheerio";
import { getCrawlerConfig } from "@/lib/config/crawler";
import { crawlPage, getRobotsText } from "@/lib/crawler/crawler";
import type { CrawlResult } from "@/lib/crawler/types";
import { shouldDiscoverUrl } from "./filter";
import { getDomain, isHttpUrl, normalizeUrl } from "./url";
import { getEnabledSeedSources, isKnownOfficialDomain } from "./source-registry";
import type { SeedSource } from "./types/source";
import { ensureSource } from "./repository";

export interface DiscoveryCandidate {
  url: string;
  normalizedUrl: string;
  domain: string;
  source: SeedSource;
  sourceId: number;
  discoveredFromUrl: string | null;
  discoveryMethod: "SEED" | "LINK" | "SITEMAP";
  depth: number;
}

export interface DiscoveryFailure {
  url: string;
  message: string;
}

export interface DiscoveryResult {
  candidates: DiscoveryCandidate[];
  sourceIds: Map<string, number>;
  seedPages: Array<{ sourceId: number; page: CrawlResult }>;
  attemptedUrls: string[];
  pagesVisited: number;
  failures: DiscoveryFailure[];
}

const MAX_SITEMAP_DEPTH = 2;
const MAX_SITEMAPS = 20;
const MAX_SITEMAP_BYTES = 2_000_000;
const MAX_URLS_PER_SITEMAP = 500;

async function readSitemap(
  sitemapUrl: string,
  depth = 0,
  visited = new Set<string>(),
): Promise<string[]> {
  if (depth > MAX_SITEMAP_DEPTH || visited.size >= MAX_SITEMAPS) return [];

  let url: string;
  try {
    url = normalizeUrl(sitemapUrl);
  } catch {
    return [];
  }

  if (visited.has(url) || !isKnownOfficialDomain(getDomain(url))) return [];
  visited.add(url);

  const config = getCrawlerConfig();
  const response = await fetch(url, {
    headers: { "user-agent": config.CRAWLER_USER_AGENT },
    redirect: "manual",
    signal: AbortSignal.timeout(config.CRAWLER_TIMEOUT_MS),
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) return [];

    let redirectUrl: URL;
    try {
      redirectUrl = new URL(location, url);
    } catch {
      return [];
    }

    if (!isHttpUrl(redirectUrl.toString())) return [];

    let normalizedRedirectUrl: string;
    let redirectDomain: string;
    try {
      normalizedRedirectUrl = normalizeUrl(redirectUrl.toString());
      redirectDomain = getDomain(normalizedRedirectUrl);
    } catch {
      return [];
    }

    const isAllowedRedirect = getEnabledSeedSources().some(
      (source) =>
        redirectDomain === source.domain ||
        redirectDomain.endsWith(`.${source.domain}`),
    );

    if (!isAllowedRedirect) return [];

    return readSitemap(normalizedRedirectUrl, depth + 1, visited);
  }

  if (!response.ok) return [];

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SITEMAP_BYTES) {
    await response.body?.cancel();
    return [];
  }

  if (!response.body) return [];

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      size += value.byteLength;
      if (size > MAX_SITEMAP_BYTES) {
        await reader.cancel();
        return [];
      }

      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const xml = new TextDecoder().decode(bytes);
  const $ = load(xml, { xmlMode: true });
  const locations = $("loc")
    .map((_, element) => $(element).text().trim())
    .get();
  const pages: string[] = [];

  for (const location of locations.slice(0, MAX_URLS_PER_SITEMAP)) {
    if (!/^https?:\/\//i.test(location)) continue;

    let normalizedLocation: string;
    try {
      normalizedLocation = normalizeUrl(location);
    } catch {
      continue;
    }

    if (normalizedLocation.toLowerCase().endsWith(".xml")) {
      const nested = await readSitemap(normalizedLocation, depth + 1, visited);
      pages.push(...nested.slice(0, MAX_URLS_PER_SITEMAP - pages.length));
    } else {
      pages.push(normalizedLocation);
    }

    if (pages.length >= MAX_URLS_PER_SITEMAP) break;
  }

  return pages;
}

function priority(url: string): number {
  const normalized = url.toLowerCase();

  if (/scholarship|fellowship|scheme|student-support/.test(normalized)) return 0;
  if (/notification|financial-aid|education/.test(normalized)) return 1;
  return 2;
}

function isSameSourceDomain(domain: string, source: SeedSource): boolean {
  return domain === source.domain || domain.endsWith(`.${source.domain}`);
}

export async function discoverCandidates(): Promise<DiscoveryResult> {
  const sources = getEnabledSeedSources();
  const sourceIds = new Map<string, number>();
  const candidates = new Map<string, DiscoveryCandidate>();
  const seedPages: DiscoveryResult["seedPages"] = [];
  const attemptedUrls = new Set<string>();
  const failures: DiscoveryFailure[] = [];
  const expansionSources: Array<{
    source: SeedSource;
    sourceId: number;
    sourcePages: Map<string, CrawlResult>;
  }> = [];
  const config = getCrawlerConfig();

  for (const source of sources) {
    if (attemptedUrls.size >= config.CRAWLER_MAX_PAGES_PER_RUN) break;

    const sourceRecord = await ensureSource(source);
    sourceIds.set(source.domain, sourceRecord.id);

    const seedUrl = normalizeUrl(source.url);
    candidates.set(seedUrl, {
      url: seedUrl,
      normalizedUrl: seedUrl,
      domain: getDomain(seedUrl),
      source,
      sourceId: sourceRecord.id,
      discoveredFromUrl: null,
      discoveryMethod: "SEED",
      depth: 0,
    });

    attemptedUrls.add(seedUrl);

    try {
      const seedPage = await crawlPage(seedUrl);
      seedPages.push({ sourceId: sourceRecord.id, page: seedPage });

      // Always key page caches by normalized URL. This avoids missing a cached
      // discovery crawl because of trailing slashes or URL normalization.
      const sourcePages = new Map<string, CrawlResult>([
        [normalizeUrl(seedPage.requestedUrl), seedPage],
        [normalizeUrl(seedPage.finalUrl), seedPage],
      ]);
      expansionSources.push({
        source,
        sourceId: sourceRecord.id,
        sourcePages,
      });

      for (const link of seedPage.links) {
        try {
          const normalizedUrl = normalizeUrl(link);
          const domain = getDomain(normalizedUrl);

          if (
            !shouldDiscoverUrl(normalizedUrl, source) ||
            !isSameSourceDomain(domain, source)
          ) {
            continue;
          }

          if (!candidates.has(normalizedUrl)) {
            candidates.set(normalizedUrl, {
              url: normalizedUrl,
              normalizedUrl,
              domain,
              source,
              sourceId: sourceRecord.id,
              discoveredFromUrl: seedPage.finalUrl,
              discoveryMethod: "LINK",
              depth: 1,
            });
          }
        } catch {
          // Ignore malformed or unsupported links without failing discovery.
        }
      }

      try {
        const robotsText = await getRobotsText(source.url);
        const robotsSitemaps = robotsText
          .split(/\r?\n/)
          .filter((line) => /^sitemap\s*:/i.test(line))
          .map((line) => line.slice(line.indexOf(":") + 1).trim())
          .filter(Boolean);

        const sitemapLocations = [
          ...new Set([
            ...robotsSitemaps,
            new URL("/sitemap.xml", source.url).toString(),
          ]),
        ];

        const sitemapResults = await Promise.allSettled(
          sitemapLocations.map((location) => readSitemap(location)),
        );

        for (let index = 0; index < sitemapResults.length; index += 1) {
          const result = sitemapResults[index];
          if (result.status === "rejected") {
            failures.push({
              url: sitemapLocations[index],
              message:
                result.reason instanceof Error
                  ? result.reason.message
                  : "Unknown sitemap discovery failure.",
            });
            continue;
          }

          for (const sitemapUrl of result.value) {
            try {
              const normalizedUrl = normalizeUrl(sitemapUrl);
              const domain = getDomain(normalizedUrl);

              if (
                !shouldDiscoverUrl(normalizedUrl, source) ||
                !isSameSourceDomain(domain, source)
              ) {
                continue;
              }

              if (!candidates.has(normalizedUrl)) {
                candidates.set(normalizedUrl, {
                  url: normalizedUrl,
                  normalizedUrl,
                  domain,
                  source,
                  sourceId: sourceRecord.id,
                  discoveredFromUrl: seedPage.finalUrl,
                  discoveryMethod: "SITEMAP",
                  depth: 1,
                });
              }
            } catch {
              // Ignore malformed sitemap entries.
            }
          }
        }
      } catch (error) {
        failures.push({
          url: `${new URL(source.url).origin}/sitemap.xml`,
          message:
            error instanceof Error
              ? error.message
              : "Unknown sitemap discovery failure.",
        });
      }
    } catch (error) {
      failures.push({
        url: seedUrl,
        message:
          error instanceof Error ? error.message : "Unknown seed crawl failure.",
      });
    }
  }

  for (const { source, sourceId, sourcePages } of expansionSources) {
    for (let depth = 1; depth <= config.CRAWLER_MAX_DEPTH; depth += 1) {
      if (attemptedUrls.size >= config.CRAWLER_MAX_PAGES_PER_RUN) break;

      const currentDepth = [...candidates.values()]
        .filter(
          (candidate) =>
            candidate.source.domain === source.domain &&
            candidate.depth === depth,
        )
        .sort((a, b) => priority(a.url) - priority(b.url));

      for (const candidate of currentDepth) {
        if (
          sourcePages.has(candidate.normalizedUrl) ||
          attemptedUrls.has(candidate.normalizedUrl)
        ) {
          continue;
        }

        if (attemptedUrls.size >= config.CRAWLER_MAX_PAGES_PER_RUN) break;

        attemptedUrls.add(candidate.normalizedUrl);

        try {
          const page = await crawlPage(candidate.url);
          sourcePages.set(candidate.normalizedUrl, page);
          sourcePages.set(normalizeUrl(page.finalUrl), page);
          seedPages.push({ sourceId, page });

          for (const link of page.links) {
            try {
              const normalizedUrl = normalizeUrl(link);
              const domain = getDomain(normalizedUrl);

              if (
                !shouldDiscoverUrl(normalizedUrl, source) ||
                !isSameSourceDomain(domain, source)
              ) {
                continue;
              }

              if (!candidates.has(normalizedUrl)) {
                candidates.set(normalizedUrl, {
                  url: normalizedUrl,
                  normalizedUrl,
                  domain,
                  source,
                  sourceId,
                  discoveredFromUrl: page.finalUrl,
                  discoveryMethod: "LINK",
                  depth: depth + 1,
                });
              }
            } catch {
              // Ignore malformed links and continue crawling other candidates.
            }
          }
        } catch (error) {
          failures.push({
            url: candidate.url,
            message:
              error instanceof Error
                ? error.message
                : "Unknown discovery crawl failure.",
          });
        }
      }
    }
  }

  const ordered = [...candidates.values()].sort(
    (a, b) => a.depth - b.depth || priority(a.url) - priority(b.url),
  );

  return {
    candidates: ordered,
    sourceIds,
    seedPages,
    attemptedUrls: [...attemptedUrls],
    pagesVisited: attemptedUrls.size,
    failures,
  };
}
