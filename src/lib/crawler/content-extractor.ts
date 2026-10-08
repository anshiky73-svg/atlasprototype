import { load } from "cheerio";

const MAX_TEXT_LENGTH = 30_000;

export function parsePage(html: string, baseUrl: string) {
  const $ = load(html);
  const title = $("title").first().text().trim();

  $("script, style, noscript, svg, nav, footer, header, form, iframe").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_LENGTH);
  const links = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    try {
      const url = new URL(href, baseUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        links.add(url.toString());
      }
    } catch {
      return;
    }
  });

  return { title, text, links: [...links] };
}
