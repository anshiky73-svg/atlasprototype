import type { SourceType } from "./source";

export interface DiscoveryCandidate {
  url: string;
  normalizedUrl: string;
  domain: string;

  discoveredFromUrl: string | null;
  discoveryMethod: DiscoveryMethod;

  sourceType: SourceType | null;
  isOfficialDomain: boolean;
}

export type DiscoveryMethod =
  | "SEED"
  | "LINK"
  | "SITEMAP"
  | "SEARCH"
  | "EXTERNAL_REFERENCE";