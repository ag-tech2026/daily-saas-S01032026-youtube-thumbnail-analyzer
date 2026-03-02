import { openrouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
import { eq, sql } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { prompt, analysisSchema, CREDITS_PER_ANALYSIS } from "@/domain";
import { db } from "@/lib/db";
import { analysis, user } from "@/lib/schema";
import { inngest } from "./client";

export const processAnalysis = inngest.createFunction(
  {
    id: "process-analysis",
    retries: 3,
  },
  { event: "analysis/upload.completed" },
  async ({ event, step }) => {
    // Validate event data
    const { analysisId } = event.data;

    if (!analysisId) {
      throw new NonRetriableError("Missing analysisId in event data");
    }

    // Update analysis status to processing
    await step.run("update-status-processing", async () => {
      const result = await db
        .update(analysis)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(analysis.id, analysisId))
        .returning();

      if (result.length === 0) {
        throw new NonRetriableError(
          `Analysis ${analysisId} not found in database`
        );
      }

      return result[0];
    });

    try {
      // Analyze poker screenshot with vision model
      const analysisResult = await step.run("analyze-with-vision", async () => {
        const modelId = "openai/gpt-4o";

        const result = await generateObject({
          model: openrouter(modelId),
          schema: analysisSchema,
          system: prompt,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze the attached YouTube thumbnail image. Extract all visible elements and produce a structured CTR-focused analysis according to the JSON schema below.",
                },
                {
                  type: "image",
                  image: event.data.imageUrl,
                },
              ],
            },
          ],
          temperature: 0,
          topP: 1,
          presencePenalty: 0,
          frequencyPenalty: 0,
        });

        return result.object;
      });

      // Save analysis result to database
      await step.run("save-analysis-result", async () => {
        await db
          .update(analysis)
          .set({
            result: JSON.stringify(analysisResult),
            status: "complete",
            updatedAt: new Date(),
          })
          .where(eq(analysis.id, analysisId));
      });

      return {
        success: true,
        analysisId,
      };
    } catch (error) {
      // Refund credit and mark analysis as failed after all retries exhausted
      await step.run("refund-credit-on-failure", async () => {
        // Atomic credit increment
        await db
          .update(user)
          .set({
            credits: sql`${user.credits} + ${CREDITS_PER_ANALYSIS}`,
          })
          .where(eq(user.id, event.data.userId));

        // Mark analysis as failed
        await db
          .update(analysis)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(analysis.id, analysisId));
      });

      // Re-throw error so Inngest marks function as failed
      throw error;
    }
  }
);
