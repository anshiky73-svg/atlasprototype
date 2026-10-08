import { chromium } from "playwright";
import { getCrawlerConfig } from "@/lib/config/crawler";
import { isKnownOfficialDomain } from "@/lib/discovery/source-registry";
import { getDomain, isHttpUrl, normalizeUrl } from "@/lib/discovery/url";
import { parsePage } from "./content-extractor";
import { hashContent } from "./hash";
import { requestHtml } from "./http-client";
import type { CrawlResult } from "./types";

const robotsCache = new Map<string, Promise<string>>();
const MIN_STATIC_TEXT_LENGTH = 120;

async function getRobots(origin: string): Promise<string> {
  let cached = robotsCache.get(origin);
  if (!cached) {
    cached = (async () => {
      let robotsUrl = `${origin}/robots.txt`;
      for (let redirects = 0; redirects <= 3; redirects += 1) {
        const parsedUrl = new URL(robotsUrl);
        if (!isHttpUrl(robotsUrl) || !isKnownOfficialDomain(parsedUrl.hostname)) return "";
        const response = await fetch(robotsUrl, {
          headers: { "user-agent": getCrawlerConfig().CRAWLER_USER_AGENT },
          redirect: "manual",
          signal: AbortSignal.timeout(5_000),
        });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          await response.body?.cancel();
          if (!location || redirects === 3) return "";
          const redirectedUrl = new URL(location, robotsUrl).toString();
          if (!isHttpUrl(redirectedUrl)) return "";
          robotsUrl = redirectedUrl;
          continue;
        }
        if (!response.ok || !response.body) return "";
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 256_000) {
            await reader.cancel();
            return "";
          }
          chunks.push(value);
        }
        const joined = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          joined.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return new TextDecoder().decode(joined);
      }
      return "";
    })()
      .catch((error: unknown) => {
        console.warn("Could not read robots.txt; proceeding with domain policy.", error);
        return "";
      });
    robotsCache.set(origin, cached);
  }
  return cached;
}

export async function getRobotsText(input: string): Promise<string> {
  if (!isHttpUrl(input)) throw new Error("Only HTTP and HTTPS URLs have crawl policy.");
  const url = new URL(input);
  if (!isKnownOfficialDomain(url.hostname)) {
    throw new Error("Robots policy may only be read for registered official-source domains.");
  }
  return getRobots(url.origin);
}

async function isDisallowedByRobots(url: URL): Promise<boolean> {
  const robots = await getRobotsText(url.toString());
  const lines = robots.split(/\r?\n/);
  const groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }> = [];
  let agents: string[] = [];
  let allow: string[] = [];
  let disallow: string[] = [];
  let hasDirectives = false;

  for (const line of lines) {
    const [rawName, ...rawValue] = line.split("#")[0].split(":");
    if (!rawName || rawValue.length === 0) continue;
    const name = rawName.trim().toLowerCase();
    const value = rawValue.join(":").trim();
    if (name === "user-agent") {
      if (hasDirectives) {
        groups.push({ agents, allow, disallow });
        agents = [];
        allow = [];
        disallow = [];
        hasDirectives = false;
      }
      agents.push(value.toLowerCase());
      continue;
    }
    if (!value || agents.length === 0) continue;
    hasDirectives = true;
    if (name === "disallow") disallow.push(value);
    if (name === "allow") allow.push(value);
  }
  if (agents.length > 0) groups.push({ agents, allow, disallow });

  const matchingGroups = groups.filter((group) =>
    group.agents.some((agent) =>
      agent === "*" || getCrawlerConfig().CRAWLER_USER_AGENT.toLowerCase().includes(agent),
    ),
  );
  const allowedRules = matchingGroups.flatMap((group) => group.allow);
  const disallowedRules = matchingGroups.flatMap((group) => group.disallow);

  const path = `${url.pathname}${url.search}`;
  const matchesRule = (rule: string) => {
    const anchored = rule.endsWith("$");
    const body = anchored ? rule.slice(0, -1) : rule;
    const pattern = body.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path);
  };
  const mostSpecificAllow = allowedRules
    .filter(matchesRule)
    .sort((a, b) => b.length - a.length)[0];
  const mostSpecificDisallow = disallowedRules
    .filter(matchesRule)
    .sort((a, b) => b.length - a.length)[0];

  return Boolean(
    mostSpecificDisallow &&
    (!mostSpecificAllow || mostSpecificDisallow.length >= mostSpecificAllow.length),
  );
}

async function renderWithBrowser(url: string): Promise<{ html: string; finalUrl: string; status: number }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const { CRAWLER_TIMEOUT_MS, CRAWLER_USER_AGENT } = getCrawlerConfig();
    const context = await browser.newContext({ userAgent: CRAWLER_USER_AGENT });
    await context.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (
        isHttpUrl(requestUrl.toString()) &&
        isKnownOfficialDomain(requestUrl.hostname)
      ) {
        await route.continue();
      } else {
        await route.abort();
      }
    });
    const page = await context.newPage();
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: CRAWLER_TIMEOUT_MS,
    });
    const finalUrl = page.url();
    if (!isHttpUrl(finalUrl) || !isKnownOfficialDomain(getDomain(finalUrl))) {
      throw new Error("Browser navigation redirected outside the allowed official-source domains.");
    }
    if (!response?.ok()) {
      throw new Error(`Browser fallback returned HTTP ${response?.status() ?? "no response"}.`);
    }
    return { html: await page.content(), finalUrl, status: response.status() };
  } finally {
    await browser.close();
  }
}

export async function crawlPage(input: string): Promise<CrawlResult> {
  if (!isHttpUrl(input)) throw new Error("Only HTTP and HTTPS URLs can be crawled.");
  const requestedUrl = normalizeUrl(input);
  const requested = new URL(requestedUrl);
  if (!isKnownOfficialDomain(requested.hostname)) {
    throw new Error(`Refusing to crawl unregistered domain ${requested.hostname}.`);
  }
  if (await isDisallowedByRobots(requested)) {
    throw new Error(`Crawling is disallowed by ${requested.origin}/robots.txt.`);
  }

  const { response, html: staticHtml } = await requestHtml(requestedUrl);
  const staticPage = parsePage(staticHtml, response.url);
  let html = staticHtml;
  let finalUrl = response.url;
  let httpStatus = response.status;

  if (staticPage.text.length < MIN_STATIC_TEXT_LENGTH) {
    try {
      const rendered = await renderWithBrowser(requestedUrl);
      html = rendered.html;
      finalUrl = rendered.finalUrl;
      httpStatus = rendered.status;
    } catch (error) {
      throw new Error(
        `Static content was insufficient and Playwright fallback failed: ${error instanceof Error ? error.message : "unknown browser error"}`,
        { cause: error },
      );
    }
  }

  if (!isKnownOfficialDomain(getDomain(finalUrl))) {
    throw new Error("Crawl redirected outside the allowed official-source domains.");
  }

  const page = parsePage(html, finalUrl);
  return {
    requestedUrl,
    finalUrl: normalizeUrl(finalUrl),
    httpStatus,
    retrievedAt: new Date().toISOString(),
    contentHash: hashContent(page.text),
    html,
    text: page.text,
    title: page.title,
    links: page.links,
  };
}
