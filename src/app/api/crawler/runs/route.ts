import { hasDatabaseConfig } from "@/lib/config/env";
import { getCrawlRuns } from "@/features/scholarship-intelligence";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasDatabaseConfig()) {
    return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }
  return Response.json({ runs: await getCrawlRuns() });
}
