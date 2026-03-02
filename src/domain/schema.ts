import { z } from "zod";

export const analysisSchema = z.object({
  thumbnail_info: z.object({
    title_text: z.string().describe("Visible text extracted from the thumbnail, empty string if none"),
    has_face: z.boolean().describe("Whether a human face is visible"),
    face_count: z.number().int().min(0).describe("Number of faces detected (0 if none)"),
    face_emotion: z.enum(["happy", "shocked", "serious", "excited", "neutral", "other"])
      .describe("Dominant emotion detected on the primary face"),
    dominant_colors: z.array(z.string()).min(2).max(4)
      .describe("2-4 dominant colors (e.g. ['red', 'black', 'white'])"),
    assumptions: z.array(z.string()).describe("Assumptions made due to unclear or low-resolution image"),
  }),
  scores: z.object({
    overall: z.number().min(0).max(10).describe("Overall CTR potential score 0-10"),
    visual_contrast: z.number().min(0).max(10).describe("How well elements pop off the background 0-10"),
    text_legibility: z.number().min(0).max(10).describe("Text readability at small thumbnail size 0-10"),
    emotional_hook: z.number().min(0).max(10).describe("Strength of face/emotion or visual drama 0-10"),
    curiosity_gap: z.number().min(0).max(10).describe("How much the thumbnail makes viewers want to click 0-10"),
  }),
  analysis: z.object({
    summary: z.string().describe("2-4 sentence overall CTR assessment"),
    main_takeaway: z.string().describe("The single most important improvement to make"),
  }),
  strengths: z
    .array(
      z.object({
        label: z.string().describe("Short label for the strength"),
        explanation: z.string().describe("Why this element works well for CTR"),
      })
    )
    .min(2)
    .describe("What works well for CTR (minimum 2)"),
  improvements: z
    .array(
      z.object({
        label: z.string().describe("Short label for the issue"),
        issue: z.string().describe("What is wrong and why it hurts CTR"),
        recommendation: z.string().describe("Specific fix to apply"),
      })
    )
    .min(2)
    .describe("What to fix to improve CTR (minimum 2)"),
  action_items: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe("3-5 specific, actionable changes to try in the next version"),
  tags: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe(
      "2-4 kebab-case classification tags (e.g. 'low-contrast', 'strong-face', 'text-overload', 'curiosity-gap', 'color-pop', 'missing-face')"
    ),
  confidence_score: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence 0-1 based on image clarity and resolution"),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;
