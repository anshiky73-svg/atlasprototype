import { load } from "cheerio";
import { getCrawlerConfig } from "@/lib/config/crawler";
import { crawlPage, getRobotsText } from "@/lib/crawler/crawler";
import type { CrawlResult } from "@/lib/crawler/types";
import { shouldDiscoverUrl } from "./filter";
import { getDomain, isHttpUrl, normalizeUrl } from "./url";
import { isKnownOfficialDomain } from "./source-registry";
import { getEnabledSeedSources } from "./source-registry";
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

async function readSitemap(
  url: string,
  depth = 0,
  visited = new Set<string>(),
): Promise<string[]> {
  if (depth > 2 || visited.size >= 20) return [];
  try {
    url = normalizeUrl(url);
  } catch {
    return [];
  }
  if (visited.has(url) || !isKnownOfficialDomain(getDomain(url))) return [];
  visited.add(url);
  const response = await fetch(url, {
    headers: { "user-agent": getCrawlerConfig().CRAWLER_USER_AGENT },
    redirect: "manual",
    signal: AbortSignal.timeout(getCrawlerConfig().CRAWLER_TIMEOUT_MS),
  });
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) return [];
    const redirectUrl = new URL(location, url);
    if (!isHttpUrl(redirectUrl.toString())) return [];
    const redirectDomain = getDomain(redirectUrl.toString());
    if (!getEnabledSeedSources().some((source) =>
      redirectDomain === source.domain || redirectDomain.endsWith(`.${source.domain}`)
    )) return [];
    return readSitemap(redirectUrl.toString(), depth + 1, visited);
  }
  if (!response.ok) return [];
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > 2_000_000) return [];
  if (!response.body) return [];
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2_000_000) {
      await reader.cancel();
      return [];
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const xml = new TextDecoder().decode(bytes);
  const $ = load(xml, { xmlMode: true });
  const locations = $("loc").map((_, element) => $(element).text().trim()).get();
  const pages: string[] = [];

  for (const location of locations.slice(0, 500)) {
    if (!/^https?:\/\//i.test(location)) continue;
    if (location.toLowerCase().endsWith(".xml")) {
      const nested = await readSitemap(location, depth + 1, visited);
      pages.push(...nested.slice(0, 500 - pages.length));
    } else {
      pages.push(location);
    }
    if (pages.length >= 500) break;
  }
  return pages;
}

function priority(url: string): number {
  const normalized = url.toLowerCase();
  if (/scholarship|fellowship|scheme|student-support/.test(normalized)) return 0;
  if (/notification|financial-aid|education/.test(normalized)) return 1;
  return 2;
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
      domain: source.domain,
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
      const sourcePages = new Map<string, CrawlResult>([[seedPage.requestedUrl, seedPage]]);
      expansionSources.push({ source, sourceId: sourceRecord.id, sourcePages });
      for (const link of seedPage.links) {
        try {
          const normalizedUrl = normalizeUrl(link);
          const domain = getDomain(normalizedUrl);
          if (
            !shouldDiscoverUrl(normalizedUrl, source) ||
            !(domain === source.domain || domain.endsWith(`.${source.domain}`))
          ) {
            continue;
          }
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
        } catch {
          continue;
        }
      }

      try {
        const robotsText = await getRobotsText(source.url);
        const robotsSitemaps = robotsText.split(/\r?\n/)
          .filter((line) => /^sitemap\s*:/i.test(line))
          .map((line) => line.slice(line.indexOf(":") + 1).trim())
          .filter(Boolean);
        const sitemapLocations = [
          ...new Set([
            ...robotsSitemaps,
            new URL("/sitemap.xml", source.url).toString(),
          ]),
        ];
        const sitemapUrls = (await Promise.all(sitemapLocations.map((url) => readSitemap(url)))).flat();
        for (const sitemapUrl of sitemapUrls) {
          try {
            const normalizedUrl = normalizeUrl(sitemapUrl);
            const domain = getDomain(normalizedUrl);
            if (
              !shouldDiscoverUrl(normalizedUrl, source) ||
              !(domain === source.domain || domain.endsWith(`.${source.domain}`))
            ) {
              continue;
            }
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
          } catch {
            continue;
          }
        }
      } catch (error) {
        failures.push({
          url: `${new URL(source.url).origin}/sitemap.xml`,
          message: error instanceof Error ? error.message : "Unknown sitemap discovery failure.",
        });
      }

    } catch (error) {
      failures.push({
        url: seedUrl,
        message: error instanceof Error ? error.message : "Unknown seed crawl failure.",
      });
    }
  }

  for (const { source, sourceId, sourcePages } of expansionSources) {
    for (let depth = 1; depth <= config.CRAWLER_MAX_DEPTH; depth += 1) {
      if (attemptedUrls.size >= config.CRAWLER_MAX_PAGES_PER_RUN) break;
      const currentDepth = [...candidates.values()].filter(
        (candidate) => candidate.source.domain === source.domain && candidate.depth === depth,
      ).sort((a, b) => priority(a.url) - priority(b.url));
      for (const candidate of currentDepth) {
        if (sourcePages.has(candidate.normalizedUrl) || attemptedUrls.has(candidate.normalizedUrl)) continue;
        if (attemptedUrls.size >= config.CRAWLER_MAX_PAGES_PER_RUN) break;
        attemptedUrls.add(candidate.normalizedUrl);
        try {
          const page = await crawlPage(candidate.url);
          sourcePages.set(candidate.normalizedUrl, page);
          seedPages.push({ sourceId, page });
          for (const link of page.links) {
            try {
              const normalizedUrl = normalizeUrl(link);
              const domain = getDomain(normalizedUrl);
              if (
                !shouldDiscoverUrl(normalizedUrl, source) ||
                !(domain === source.domain || domain.endsWith(`.${source.domain}`))
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
              continue;
            }
          }
        } catch (error) {
          failures.push({
            url: candidate.url,
            message: error instanceof Error ? error.message : "Unknown discovery crawl failure.",
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
