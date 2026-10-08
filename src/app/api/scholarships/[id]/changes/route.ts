import { hasDatabaseConfig } from "@/lib/config/env";
import { db } from "@/prisma/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!hasDatabaseConfig()) {
    return Response.json({ error: "DATABASE_URL is not configured." }, { status: 503 });
  }
  const { id: rawId } = await params;
  const scholarshipId = Number(rawId);
  if (!Number.isInteger(scholarshipId) || scholarshipId < 1) {
    return Response.json({ error: "Scholarship ID must be a positive integer." }, { status: 400 });
  }
  const changes = await db.orm.public.ChangeEvent
    .where({ scholarshipId })
    .orderBy((item) => item.detectedAt.desc())
    .limit(200)
    .all();
  return Response.json({ changes });
}
