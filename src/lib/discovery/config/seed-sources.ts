import type { SeedSource } from "../types/source";

export const SEED_SOURCES: SeedSource[] = [
  {
    name: "National Scholarship Portal",
    url: "https://scholarships.gov.in/",
    domain: "scholarships.gov.in",
    sourceType: "GOVERNMENT",
    isOfficial: true,
    isPrimarySource: true,
    enabled: true,
    includePatterns: [
      "scholar",
      "scheme",
      "application",
      "notification",
    ],
    excludePatterns: [
      "/login",
      "/register",
      "/contact",
      "/privacy",
      "/terms",
    ],
  },

  {
    name: "University Grants Commission",
    url: "https://www.ugc.gov.in/",
    domain: "ugc.gov.in",
    sourceType: "UGC",
    isOfficial: true,
    isPrimarySource: true,
    enabled: true,
    includePatterns: [
      "scholarship",
      "fellowship",
      "scheme",
      "notification",
    ],
    excludePatterns: [
      "/login",
      "/register",
      "/contact",
    ],
  },

  {
    name: "All India Council for Technical Education",
    url: "https://www.aicte-india.org/",
    domain: "aicte-india.org",
    sourceType: "AICTE",
    isOfficial: true,
    isPrimarySource: true,
    enabled: true,
    includePatterns: [
      "scholarship",
      "scheme",
      "fellowship",
      "student",
      "pragati",
      "saksham",
      "swanath",
    ],
    excludePatterns: [
      "/login",
      "/register",
      "/contact",
    ],
  },
];