import Image from "next/image";
import { Badge } from "@/components/ui/badge";

export function AnalysisMockup() {
  return (
    <div
      className="rounded-xl border border-border/60 shadow-2xl overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60 bg-muted/40">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Live Demo
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge variant="outline" className="text-xs py-0 border-amber-400/50 text-amber-400">
            Beginner
          </Badge>
          <Badge variant="secondary" className="text-xs py-0">
            95% confidence
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">

        {/* ── LEFT: uploaded screenshot ── */}
        <div className="border-b md:border-b-0 md:border-r border-border/60">
          <div className="px-3 py-2 border-b border-border/40 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              📸 What you upload
            </p>
          </div>
          <div className="relative w-full aspect-[9/16] bg-black">
            <Image
              src="/demo/poker_000.png"
              alt="Poker hand screenshot — QQ vs AK, NL Hold'em $0.01/$0.02"
              fill
              className="object-contain object-top"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        </div>

        {/* ── RIGHT: AI analysis ── */}
        <div className="flex flex-col bg-background divide-y divide-border/40">

          <div className="px-3 py-2 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              🤖 What AI returns
            </p>
          </div>

          {/* Tags */}
          <div className="px-3 py-2 flex flex-wrap gap-1.5">
            {["overcommitment", "board-awareness", "pot-control"].map(tag => (
              <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
                {tag}
              </span>
            ))}
          </div>

          {/* Hand snapshot */}
          <div className="px-3 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              🃏 Hand Details
            </p>
            <div className="grid grid-cols-3 gap-x-2 gap-y-2 text-xs">
              <div>
                <p className="text-muted-foreground text-[10px] mb-0.5">Stakes</p>
                <p className="font-semibold">$0.01/$0.02</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] mb-0.5">Position</p>
                <p className="font-semibold">SB</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] mb-0.5">Stack</p>
                <p className="font-semibold">32 BB</p>
              </div>
            </div>
            <div className="mt-2 text-xs">
              <p className="text-muted-foreground text-[10px] mb-0.5">Hero hand</p>
              <p className="font-mono font-bold tracking-wider text-sm">Q♦ Q♣</p>
            </div>
            <div className="mt-2 text-xs">
              <p className="text-muted-foreground text-[10px] mb-0.5">Board</p>
              <p className="font-mono font-semibold tracking-wider">
                10♥ 8♠ J♦ · 2♠ ·{" "}
                <span className="text-red-400">A♠</span>
              </p>
            </div>
          </div>

          {/* Bottom line */}
          <div className="px-3 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              🔥 Bottom Line
            </p>
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-2">
              <p className="text-xs leading-relaxed">
                Be cautious with overpairs on coordinated boards, especially when facing aggression.
              </p>
            </div>
          </div>

          {/* Good plays */}
          <div className="px-3 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              ✅ Good Plays
            </p>
            <div className="space-y-1.5">
              {[
                { label: "Preflop 3-bet", note: "Correctly isolated the raiser and built the pot." },
                { label: "Flop call", note: "Kept pot manageable while still ahead." },
              ].map(p => (
                <div key={p.label} className="flex gap-2 text-xs">
                  <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                  <div>
                    <span className="font-semibold">{p.label}</span>
                    <span className="text-muted-foreground"> — {p.note}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Areas to improve */}
          <div className="px-3 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              ❌ Areas to Improve
            </p>
            <div className="space-y-2">
              {[
                { label: "Turn all-in", fix: "Bet smaller or check back — 32 BB stack makes pot control critical." },
                { label: "Board texture", fix: "10♥ 8♠ J♦ is highly coordinated; re-assess before committing." },
              ].map(a => (
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
