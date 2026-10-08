const excludedPatterns = [
  /\b(login|log in|sign in|register|create account)\b/i,
  /\b(privacy policy|terms and conditions|cookie policy)\b/i,
  /\b(contact us|about us|site map)\b/i,
];

const scholarshipPatterns = [
  /\bscholarships?\b/i,
  /\bfellowships?\b/i,
  /\bstudent (?:funding|grant|aid|benefit)\b/i,
  /\beducation (?:grant|funding|assistance)\b/i,
  /\bfinancial assistance\b/i,
  /\btuition (?:fee|support|waiver)\b/i,
];

export type PageClassification = "SCHOLARSHIP" | "UNRELATED" | "LOGIN_OR_POLICY";

export function classifyPage(title: string, url: string, text: string): PageClassification {
  const haystack = `${title}\n${url}\n${text.slice(0, 8_000)}`;
  if (excludedPatterns.some((pattern) => pattern.test(haystack))) {
    return "LOGIN_OR_POLICY";
  }
  return scholarshipPatterns.some((pattern) => pattern.test(haystack))
    ? "SCHOLARSHIP"
    : "UNRELATED";
}
