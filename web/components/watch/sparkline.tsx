import { cn } from "@/lib/utils";

/** Hand-written SVG sparkline. Values are plotted relative to their own range; no axis, no library. */
export function Sparkline({
  values,
  width = 120,
  height = 28,
  label,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  label: string;
  className?: string;
}) {
  if (values.length < 2) {
    return <span className={cn("block text-micro text-ink-faint", className)}>Not enough checks yet</span>;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = max === min ? height / 2 : pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
    >
      <polyline
        points={points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill="currentColor" />
    </svg>
  );
}
