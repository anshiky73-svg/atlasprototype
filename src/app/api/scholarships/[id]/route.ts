import { hasDatabaseConfig } from "@/lib/config/env";
import { getScholarshipDetail } from "@/features/scholarship-intelligence";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasDatabaseConfig()) {
    return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return Response.json({ error: "Scholarship ID must be a positive integer." }, { status: 400 });
  }

  const detail = await getScholarshipDetail(id);
  if (!detail.scholarship) {
    return Response.json({ error: "Scholarship was not found." }, { status: 404 });
  }
  return Response.json(detail);
}
