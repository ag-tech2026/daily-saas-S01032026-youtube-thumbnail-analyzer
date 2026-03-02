interface ScoreCardProps {
  scores: {
    overall: number;
    visual_contrast: number;
    text_legibility: number;
    emotional_hook: number;
    curiosity_gap: number;
  };
}

function scoreBarColor(value: number): string {
  if (value >= 8) return "bg-green-500";
  if (value >= 5) return "bg-yellow-500";
  return "bg-red-500";
}

function scoreTextColor(value: number): string {
  if (value >= 8) return "text-green-600 dark:text-green-400";
  if (value >= 5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function ScoreCard({ scores }: ScoreCardProps) {
  const subScores = [
    { label: "Visual Contrast", value: scores.visual_contrast },
    { label: "Text Legibility", value: scores.text_legibility },
    { label: "Emotional Hook", value: scores.emotional_hook },
    { label: "Curiosity Gap", value: scores.curiosity_gap },
  ];

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Overall score header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Overall CTR Score
        </span>
        <span className={`text-2xl font-bold tabular-nums ${scoreTextColor(scores.overall)}`}>
          {scores.overall.toFixed(1)}
          <span className="text-sm font-normal text-muted-foreground"> / 10</span>
        </span>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-muted">
        <div
          className={`h-full transition-all ${scoreBarColor(scores.overall)}`}
          style={{ width: `${(scores.overall / 10) * 100}%` }}
        />
      </div>

      {/* Sub-scores */}
      <div className="divide-y divide-border/50">
        {subScores.map((item) => (
          <div key={item.label} className="flex items-center gap-4 px-4 py-2.5">
            <span className="text-sm text-muted-foreground flex-1 min-w-0">{item.label}</span>
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${scoreBarColor(item.value)}`}
                  style={{ width: `${(item.value / 10) * 100}%` }}
                />
              </div>
              <span
                className={`text-sm font-semibold tabular-nums w-8 text-right ${scoreTextColor(item.value)}`}
              >
                {item.value.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
