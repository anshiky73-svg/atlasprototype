export function normalizeUrl(input: string): string {
  const url = new URL(input);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError("Only HTTP and HTTPS URLs can be discovered.");
  }
  if (url.username || url.password) {
    throw new TypeError("URLs containing embedded credentials cannot be discovered.");
  }
  if (url.port) {
    throw new TypeError("URLs using non-standard ports cannot be discovered.");
  }

  url.hash = "";

  // Remove common tracking parameters.
  const trackingParameters = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
  ];

  for (const parameter of [...url.searchParams.keys()]) {
    if (
      trackingParameters.includes(parameter.toLowerCase()) ||
      parameter.toLowerCase().startsWith("utm_")
    ) {
      url.searchParams.delete(parameter);
    }
  }

  url.hostname = url.hostname.toLowerCase();
  url.protocol = url.protocol.toLowerCase();
  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }

  // Normalize trailing slash.
  if (url.pathname !== "/") {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

export function getDomain(input: string): string {
  return new URL(input).hostname.toLowerCase();
}

export function isHttpUrl(input: string): boolean {
  try {
    const url = new URL(input);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.username &&
      !url.password &&
      !url.port
    );
  } catch {
    return false;
  }
}