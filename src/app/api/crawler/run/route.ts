import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { hasDatabaseConfig, requireCronSecret } from "@/lib/config/env";
import { runCrawl } from "@/lib/crawler/crawl-runner";
import { db } from "@/prisma/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function credentialsMatch(received: string | null, expected: string): boolean {
  if (!received) return false;
  const receivedBytes = Buffer.from(received);
  const expectedBytes = Buffer.from(`Bearer ${expected}`);
  return receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes);
}

function redactSecrets(message: string): string {
  return [
    process.env["GEMINI_API_KEY"],
    process.env["DATABASE_URL"],
    process.env["CRON_SECRET"],
  ].filter((secret): secret is string => Boolean(secret))
    .reduce((safe, secret) => safe.replaceAll(secret, "[redacted]"), message);
}

export async function POST(request: Request) {
  let secret: string;
  try {
    secret = requireCronSecret();
  } catch {
    return Response.json(
      { error: "CRON_SECRET must be set to a random value of at least 32 characters." },
      { status: 503 },
    );
  }
  if (!credentialsMatch(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized crawler request." }, { status: 401 });
  }
  if (!hasDatabaseConfig()) {
    return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const activeRun = await db.orm.public.CrawlRun
    .where({ status: "RUNNING" })
    .first();
  if (activeRun) {
    return Response.json(
      { error: "A crawl run is already in progress.", crawlRunId: activeRun.id },
      { status: 409 },
    );
  }

  try {
    return Response.json(await runCrawl(), { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        {
          error: "Crawler configuration is invalid.",
          details: error.issues.map((issue) => issue.message),
        },
        { status: 503 },
      );
    }
    const message = redactSecrets(
      error instanceof Error ? error.message : "Unknown crawler failure.",
    );
    return Response.json({ error: message }, { status: 500 });
  }
}
