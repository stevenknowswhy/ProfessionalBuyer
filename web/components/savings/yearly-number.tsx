"use client";

import { formatUsd } from "@buyer/contract";
import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const ROLL = { duration: 1200, easing: "cubic-bezier(0.23, 1, 0.32, 1)" } as const;

/**
 * Digit roll for a contract cent amount.
 * The accessible name is formatUsd. NumberFlow uses the same en-US currency
 * format so the visible figure matches that string once the roll finishes.
 */
export function YearlySavingsNumber({ cents, className }: { cents: number; className?: string }) {
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setAmount(cents / 100));
    return () => cancelAnimationFrame(frame);
  }, [cents]);

  return (
    <span className={cn("inline-block max-w-full text-margin", className)}>
      <span className="sr-only">{formatUsd(cents)}</span>
      <NumberFlow
        value={amount}
        locales="en-US"
        format={{ style: "currency", currency: "USD" }}
        respectMotionPreference
        trend={0}
        transformTiming={ROLL}
        spinTiming={ROLL}
        opacityTiming={{ duration: 200, easing: "ease-out" }}
        className="type-number"
        aria-hidden
      />
    </span>
  );
}
