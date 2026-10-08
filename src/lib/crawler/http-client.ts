import { getCrawlerConfig } from "@/lib/config/crawler";
import { isKnownOfficialDomain } from "@/lib/discovery/source-registry";
import { isHttpUrl } from "@/lib/discovery/url";

const MAX_HTML_BYTES = 2_000_000;

async function requestHtmlOnce(url: string): Promise<{
  response: Response;
  html: string;
}> {
  const { CRAWLER_TIMEOUT_MS, CRAWLER_USER_AGENT } = getCrawlerConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRAWLER_TIMEOUT_MS);

  try {
    let currentUrl = url;
    let response: Response | undefined;
    for (let redirects = 0; redirects <= 5; redirects += 1) {
      const current = new URL(currentUrl);
      if (
        !isHttpUrl(currentUrl) ||
        !isKnownOfficialDomain(current.hostname)
      ) {
        throw new Error("Refusing to follow a redirect outside registered official-source domains.");
      }
      response = await fetch(currentUrl, {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": CRAWLER_USER_AGENT,
        },
        redirect: "manual",
        signal: controller.signal,
      });
      if (response.status < 300 || response.status >= 400) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("The server returned a redirect without a location.");
      if (redirects === 5) throw new Error("Too many redirects while crawling.");
      currentUrl = new URL(location, currentUrl).toString();
    }

    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status ?? "no response"} while crawling a page.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("html")) {
      throw new Error("The response is not an HTML page.");
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
      throw new Error(`Page exceeds the ${MAX_HTML_BYTES}-byte crawl limit.`);
    }
    if (!response.body) throw new Error("The server returned an empty response body.");

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error(`Page exceeds the ${MAX_HTML_BYTES}-byte crawl limit.`);
      }
      chunks.push(value);
    }

    const joined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { response, html: new TextDecoder().decode(joined) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestHtml(url: string): Promise<{
  response: Response;
  html: string;
}> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await requestHtmlOnce(url);
    } catch (error) {
      const transient =
        error instanceof TypeError ||
        (error instanceof Error &&
          (error.name === "AbortError" ||
            error.name === "TimeoutError" ||
            /^HTTP 5\d\d/.test(error.message)));
      if (!transient || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw new Error("Unable to retrieve the page after retrying.");
}
