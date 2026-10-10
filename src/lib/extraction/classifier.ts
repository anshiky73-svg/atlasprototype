const excludedPatterns = [
  /\b(login|log in|sign in|sign-in|register|create account|forgot password)\b/i,
  /\b(privacy policy|terms and conditions|terms of service|cookie policy)\b/i,
  /\b(contact us|about us|site map|sitemap)\b/i,
];

const scholarshipPatterns = [
  /\bscholarships?\b/i,
  /\bfellowships?\b/i,
  /\bstipends?\b/i,
  /\b(grants?|grant-in-aid|financial support|financial assistance|tuition fee|tuition support|education assistance)\b/i,
  /\bstudent\s+(funding|grant|aid|benefit|support)\b/i,
  /\beducation\s+(grant|funding|assistance)\b/i,
  /\btuition\s+(fee|support|waiver)\b/i,
  /\bawards?\b/i,
  /\bschemes?\b/i,
];

export type PageClassification =
  | "SCHOLARSHIP"
  | "UNRELATED"
  | "LOGIN_OR_POLICY";

const excludedUrlOrTitlePatterns = [
  /(?:^|\/)(?:login|log-in|signin|sign-in|register|signup|sign-up|forgot-password)(?:\/|$|[?#])/i,
  /(?:^|\/)(?:privacy-policy|terms(?:-and-conditions|-of-service)?|cookie-policy|contact-us|about-us|sitemap)(?:\/|$|[?#])/i,
];

const scholarshipUrlPatterns = [
  /(?:^|\/)(?:all-scholarships?|scholarships?|fellowships?|awards?)(?:\/|$|[?#])/i,
  /(?:^|\/)schemes?(?:\/|$|[?#])/i,
  /(?:^|\/)student[-_/](?:support|aid|grant|funding)(?:\/|$|[?#])/i,
];

export function classifyPage(
  title: string,
  url: string,
  text: string,
): PageClassification {
  const normalizedTitle = title.trim();
  const normalizedUrl = url.trim();

  // Reject obvious account/policy pages based on the title or URL, rather
  // than matching words that may occur in navigation or footer text.
  if (
    excludedUrlOrTitlePatterns.some(
      (pattern) => pattern.test(normalizedUrl) || pattern.test(normalizedTitle),
    ) ||
    excludedPatterns.some((pattern) => pattern.test(normalizedTitle))
  ) {
    return "LOGIN_OR_POLICY";
  }

  if (scholarshipUrlPatterns.some((pattern) => pattern.test(normalizedUrl))) {
    return "SCHOLARSHIP";
  }

  // A scholarship can be hosted by a private university, company, foundation,
  // NGO, or government organization. Classification is based on page content,
  // not whether the domain is in the seed-source registry.
  const haystack = `${normalizedTitle}\n${normalizedUrl}\n${text.slice(0, 8_000)}`;

  return scholarshipPatterns.some((pattern) => pattern.test(haystack))
    ? "SCHOLARSHIP"
    : "UNRELATED";
}
