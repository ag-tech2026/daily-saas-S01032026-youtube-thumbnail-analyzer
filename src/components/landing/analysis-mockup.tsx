import { Badge } from "@/components/ui/badge";

export function AnalysisMockup() {
  return (
    <div
      className="rounded-xl border border-border/60 shadow-2xl overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/40">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Live Demo
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="secondary" className="text-xs py-0">
            92% confidence
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b md:border-b-0 md:border-r border-border/60">
          <div className="px-3 py-2 border-b border-border/40 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              🖼️ What you upload
            </p>
          </div>
          <div className="relative w-full aspect-video bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400 flex items-center justify-center">
            <div className="text-center px-4">
              <p className="text-white font-black text-2xl leading-tight drop-shadow-lg">
                I QUIT My Job
              </p>
              <div className="mt-3 w-12 h-12 rounded-full bg-white/20 border-2 border-white/60 mx-auto" />
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-background divide-y divide-border/40">
          <div className="px-3 py-2 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              🤖 What AI returns
            </p>
          </div>

          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Overall CTR Score
              </p>
              <span className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                8.0<span className="text-xs font-normal text-muted-foreground"> / 10</span>
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: "80%" }} />
            </div>
          </div>

          <div className="px-3 py-2 space-y-1.5">
            {[
              { label: "Visual Contrast", value: 9.0, pct: "90%", green: true },
              { label: "Text Legibility", value: 8.5, pct: "85%", green: true },
              { label: "Emotional Hook",  value: 8.0, pct: "80%", green: true },
              { label: "Curiosity Gap",   value: 6.5, pct: "65%", green: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground flex-1">{s.label}</span>
                <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.green ? "bg-green-500" : "bg-yellow-500"}`}
                    style={{ width: s.pct }}
                  />
                </div>
                <span className={`font-semibold w-6 text-right ${s.green ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>

          <div className="px-3 py-2 flex flex-wrap gap-1.5">
            {["high-contrast", "strong-face", "curiosity-gap"].map((tag) => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                {tag}
              </span>
            ))}
          </div>

          <div className="px-3 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              🔥 Bottom Line
            </p>
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-2">
              <p className="text-xs leading-relaxed">
                Add a visual context element to deepen the curiosity gap.
              </p>
            </div>
          </div>

          <div className="px-3 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              ❌ What to Fix
            </p>
            <div className="space-y-1.5">
              {[
                { label: "Weak curiosity gap", fix: "Add a small icon hinting at stakes without revealing the outcome." },
                { label: "Text size", fix: "Increase font weight to 900 and add drop shadow for mobile legibility." },
              ].map((a) => (
                <div key={a.label} className="flex gap-2 text-xs">
                  <span className="text-red-400 shrink-0 mt-0.5">✗</span>
                  <div>
                    <p className="font-semibold">{a.label}</p>
                    <p className="text-muted-foreground leading-snug">{a.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
