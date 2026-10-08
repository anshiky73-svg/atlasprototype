export interface CrawlResult {
  requestedUrl: string;
  finalUrl: string;
  httpStatus: number;
  retrievedAt: string;
  contentHash: string;
  html: string;
  text: string;
  title: string;
  links: string[];
}
