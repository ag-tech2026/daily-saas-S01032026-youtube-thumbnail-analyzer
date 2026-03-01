import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { analysis } from "@/lib/schema";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analyses = await db
    .select()
    .from(analysis)
    .where(eq(analysis.userId, session.user.id))
    .orderBy(desc(analysis.createdAt))
    .limit(50);

  return Response.json(analyses);
}
