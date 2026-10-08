import { z } from "zod";

const crawlerConfigSchema = z.object({
  CRAWLER_USER_AGENT: z.string().min(1).default("ScholarshipIntelligenceCrawler/1.0"),
  CRAWLER_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(60_000).default(20_000),
  CRAWLER_MAX_DEPTH: z.coerce.number().int().min(0).max(5).default(2),
  CRAWLER_MAX_PAGES_PER_RUN: z.coerce.number().int().min(1).max(100).default(30),
  CRAWLER_CONCURRENCY_PER_DOMAIN: z.coerce.number().int().min(1).max(5).default(2),
  EXPIRING_SOON_DAYS: z.coerce.number().int().min(1).max(180).default(30),
});

export type CrawlerConfig = z.infer<typeof crawlerConfigSchema>;

export function getCrawlerConfig(): CrawlerConfig {
  return crawlerConfigSchema.parse(process.env);
}
