import { z } from "zod";

const suggestionSchema = z.object({
  what: z.string().describe("What to change"),
  why: z.string().describe("Why it matters"),
  impact: z.enum(["high", "medium", "low"]).describe("Estimated impact"),
});

const facesSchema = z.object({
  present: z.boolean(),
  effectiveness: z.enum(["high", "medium", "low"]),
  notes: z.string(),
});

const textSchema = z.object({
  readable: z.boolean(),
  length: z.enum(["short", "medium", "long"]),
  contrast: z.enum(["good", "fair", "poor"]),
  notes: z.string(),
});

const colorsSchema = z.object({
  vibrant: z.boolean(),
  harmonious: z.boolean(),
  notes: z.string(),
});

const compositionSchema = z.object({
  balanced: z.boolean(),
  focalPointClear: z.boolean(),
  notes: z.string(),
});

const brandingSchema = z.object({
  present: z.boolean(),
  consistent: z.boolean(),
  notes: z.string(),
});

const curiositySchema = z.object({
  effective: z.boolean(),
  notes: z.string(),
});

const elementsSchema = z.object({
  faces: facesSchema,
  text: textSchema,
  colors: colorsSchema,
  composition: compositionSchema,
  branding: brandingSchema,
  curiosityGap: curiositySchema,
});

const audienceMatchSchema = z.object({
  niche: z.string(),
  matchScore: z.number().min(0).max(100),
  suggestions: z.array(z.string()),
});

const differentiationSchema = z.object({
  standsOut: z.boolean(),
  clichés: z.array(z.string()),
  opportunities: z.array(z.string()),
});

export const analysisSchema = z.object({
  score: z.number().min(0).max(100).describe("Overall clickability score 0-100"),
  ctrPrediction: z.number().min(0).max(20).describe("Estimated CTR percentage"),
  suggestions: z.array(suggestionSchema).min(3).describe("At least 3 improvement suggestions"),
  elements: elementsSchema,
  audienceMatch: audienceMatchSchema,
  differentiation: differentiationSchema,
  summary: z.string().describe("2-3 sentence overall assessment"),
  confidence: z.number().min(0).max(1).describe("Confidence in analysis 0-1"),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;
