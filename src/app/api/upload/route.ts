import { headers } from "next/headers";
import { eq, gt, and, sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user, analysis } from "@/lib/schema";
import { upload, sanitizeFilename } from "@/lib/storage";
import { CREDITS_PER_ANALYSIS } from "@/domain";

export async function POST(req: Request) {
  try {
    // Authentication check
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Atomic credit deduction
    const result = await db
      .update(user)
      .set({ credits: sql`${user.credits} - ${CREDITS_PER_ANALYSIS}` })
      .where(and(eq(user.id, session.user.id), gt(user.credits, CREDITS_PER_ANALYSIS)))
      .returning({ credits: user.credits });

    // Check if credit deduction succeeded
    if (result.length === 0) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse FormData
    const formData = await req.formData();
    const fileEntry = formData.get("file");

    // Validate file entry
    if (!fileEntry || !(fileEntry instanceof File)) {
      return new Response(
        JSON.stringify({ error: "File is required and must be a valid file" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const file = fileEntry as File;

    // Server-side validation: file size
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: "File too large. Maximum size is 10MB" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Server-side validation: file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Only PNG, JPG, and WebP images are allowed" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Convert File to Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Create analysis record with pending status
    const analysisId = crypto.randomUUID();
    await db.insert(analysis).values({
      id: analysisId,
      userId: session.user.id,
      imageUrl: null,
      status: "pending",
      result: null,
    });

    // Upload to storage
    let storageResult;
    try {
      const sanitizedName = sanitizeFilename(file.name);
      const filename = `${analysisId}-${sanitizedName}`;
      storageResult = await upload(buffer, filename, "screenshots");
    } catch (uploadError) {
      // Leave analysis record as "pending" for retry/refund in later phases
      return new Response(JSON.stringify({ error: "Upload failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update analysis record with imageUrl and status
    await db
      .update(analysis)
      .set({
        imageUrl: storageResult.url,
        status: "uploaded",
      })
      .where(eq(analysis.id, analysisId));

    // Trigger background job for analysis processing
    try {
      await inngest.send({
        name: "analysis/upload.completed",
        data: {
          analysisId,
          userId: session.user.id,
          imageUrl: storageResult.url,
        },
      });
    } catch (inngestError) {
      // Log but don't fail the upload - analysis record exists for retry
      console.error("Failed to trigger analysis job:", inngestError);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        analysisId,
        imageUrl: storageResult.url,
        credits: result[0]?.credits ?? 0,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
