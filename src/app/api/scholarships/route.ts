import { getScholarships } from "@/features/scholarship-intelligence";
import { hasDatabaseConfig } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!hasDatabaseConfig()) {
    return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const scholarships = await getScholarships(query, status);
  return Response.json({ scholarships });
}
