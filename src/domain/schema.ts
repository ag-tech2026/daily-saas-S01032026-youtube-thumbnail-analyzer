import { z } from "zod";

export const analysisSchema = z.object({
  hand_info: z.object({
    stakes: z.string().describe("Stakes (e.g. '$0.02/$0.05')"),
    game_type: z.string().describe("Game type (e.g. 'Rush & Cash', 'Zoom', 'Regular')"),
    hero_position: z.string().describe("Hero's position (e.g. 'UTG', 'BTN', 'BB')"),
    hero_hand: z.string().describe("Hero's hole cards (e.g. 'J♠ J♦')"),
    effective_stack_bb: z.number().describe("Effective stack depth in big blinds"),
    assumptions: z.array(z.string()).describe("Assumptions made due to missing info"),
  }),
  board: z.object({
    flop: z.string().describe("Flop cards (e.g. 'Q♦ 2♠ Q♥') or empty string if no flop"),
    turn: z.string().describe("Turn card or empty string if no turn"),
    river: z.string().describe("River card or empty string if no river"),
  }),
  action_summary: z.object({
    preflop: z.string().describe("Preflop action summary"),
    flop: z.string().describe("Flop action summary or empty string if no flop"),
    turn: z.string().describe("Turn action summary or empty string if no turn"),
    river: z.string().describe("River action summary or empty string if no river"),
  }),
  analysis: z.object({
    summary: z.string().describe("Overall hand analysis summary (2-4 sentences)"),
    main_takeaway: z.string().describe("The single most important lesson from this hand"),
  }),
  good_plays: z.array(
    z.object({
      label: z.string().describe("Short label for the good play (e.g. 'UTG open with JJ')"),
      explanation: z.string().describe("Why this was a good play"),
    })
  ).min(3).describe("List of things Hero did well (minimum 3)"),
  areas_to_improve: z.array(
    z.object({
      label: z.string().describe("Short label for the mistake (e.g. 'Deep stack overcommitment')"),
      mistake: z.string().describe("What Hero did wrong"),
      recommended_line: z.string().describe("What Hero should have done instead"),
    })
  ).min(3).describe("List of mistakes with recommended corrections (minimum 3)"),
  improvement_tips: z.array(z.string()).describe("3-5 actionable tips Hero should apply next time"),
  tags: z.array(z.string()).describe("2-4 short kebab-case tags (e.g. 'deep-stack-error', 'preflop-leak')"),
  difficulty_level: z.enum(["beginner", "reg"]).describe("Skill level this hand is relevant for"),
  confidence_score: z.object({
    hero_decisions: z.number().min(0).max(1).describe("Confidence 0-1 in the analysis quality based on image clarity"),
  }),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;
