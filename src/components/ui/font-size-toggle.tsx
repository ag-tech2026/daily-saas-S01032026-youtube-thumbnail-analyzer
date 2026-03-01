"use client";

import { useFontSize } from "@/components/font-size-provider";
import { cn } from "@/lib/utils";

const SIZES = [
  { value: "sm" as const, label: "A", title: "Small text" },
  { value: "md" as const, label: "A", title: "Normal text" },
  { value: "lg" as const, label: "A", title: "Large text" },
] as const;

export function FontSizeToggle() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div
      className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5"
      role="group"
      aria-label="Font size"
    >
      {SIZES.map(({ value, label, title }, i) => (
        <button
          key={value}
          onClick={() => setFontSize(value)}
          title={title}
          aria-pressed={fontSize === value}
          className={cn(
            "flex items-center justify-center rounded px-1.5 py-0.5 transition-all duration-150 font-medium leading-none select-none",
            i === 0 && "text-[11px]",
            i === 1 && "text-[13px]",
            i === 2 && "text-[15px]",
            fontSize === value
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
