import { formatUsd } from "@buyer/contract";
import { cn } from "@/lib/utils";

/**
 * Digits stay tabular. Schibsted's tabular comma and period occupy a full
 * digit slot, which hides the mark inside a gap, so punctuation is proportional.
 */
export function MoneyFigure({ cents, className }: { cents: number; className?: string }) {
  const text = formatUsd(cents);
  return (
    <span className={cn("type-number", className)}>
      {Array.from(text, (char, index) =>
        char === "," || char === "." ? (
          <span key={index} className="money-punct">
            {char}
          </span>
        ) : (
          char
        ),
      )}
    </span>
  );
}
