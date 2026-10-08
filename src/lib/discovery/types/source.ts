export type SourceType =
  | "GOVERNMENT"
  | "UNIVERSITY"
  | "UGC"
  | "AICTE"
  | "MINISTRY"
  | "CSR"
  | "FOUNDATION"
  | "TRUST"
  | "OTHER_OFFICIAL";

export interface SeedSource {
  name: string;
  url: string;
  domain: string;
  sourceType: SourceType;
  isOfficial: boolean;
  isPrimarySource: boolean;
  enabled: boolean;

  /**
   * Discovery hints only.
   * These do not determine whether a source is trustworthy.
   */
  includePatterns?: string[];

  /**
   * URL patterns that should normally be ignored.
   */
  excludePatterns?: string[];
}