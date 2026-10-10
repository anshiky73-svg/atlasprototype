import { z } from "zod";
import { hasDatabaseConfig } from "@/lib/config/env";
import { runCrawl } from "@/lib/crawler/crawl-runner";
import { db } from "@/prisma/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!host) return true;
  if (!origin) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function isStaleCrawlRun(run: { startedAt: string; updatedAt?: string | null; completedAt?: string | null }) {
  const lastActivityAt = run.updatedAt ?? run.startedAt;
  const lastActivity = new Date(lastActivityAt);
  if (!Number.isFinite(lastActivity.getTime())) {
    return false;
  }
  const staleWindowMs = 10 * 60 * 1_000;
  return Date.now() - lastActivity.getTime() > staleWindowMs;
}

export async function POST(request: Request) {
  if (!hasDatabaseConfig()) {
    return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  if (process.env.NODE_ENV !== "development" && !isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden: crawler start requests must originate from this app." }, { status: 403 });
  }

  const activeRun = await db.orm.public.CrawlRun
    .where({ status: "RUNNING" })
    .orderBy((run) => run.startedAt.desc())
    .first();

  if (activeRun) {
    if (isStaleCrawlRun(activeRun)) {
      await db.orm.public.CrawlRun.where({ id: activeRun.id }).update({
        status: "FAILED",
        completedAt: new Date().toISOString(),
        errorMessage: "Previous crawl exceeded the timeout window and was marked failed.",
      });
    } else {
      return Response.json(
        { error: "A crawl run is already in progress.", crawlRunId: activeRun.id },
        { status: 409 },
      );
    }
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
    const message = error instanceof Error ? error.message : "Unknown crawler failure.";
    return Response.json({ error: message }, { status: 500 });
  }
}
