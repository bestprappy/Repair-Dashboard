import { cn } from "@/lib/utils";

export type ScoreMeterTone = "good" | "warning" | "bad" | "neutral";

const TRACK_TONE: Record<ScoreMeterTone, string> = {
  good: "bg-success",
  warning: "bg-warning",
  bad: "bg-error",
  neutral: "bg-primary",
};

interface ScoreMeterProps {
  /** Filled portion, 0–100. Values outside the range are clamped. */
  value: number | null;
  /** Fill color intent. Defaults to neutral (brand). */
  tone?: ScoreMeterTone;
  /** Text shown beside the bar; hidden when omitted. */
  label?: string;
  className?: string;
}

/**
 * Compact 0–100 progress meter for a normalized score. Purely presentational;
 * exposes ARIA meter semantics so screen readers announce the value.
 */
export function ScoreMeter({
  value,
  tone = "neutral",
  label,
  className,
}: ScoreMeterProps) {
  const clamped =
    value == null ? null : Math.max(0, Math.min(100, value));

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped ?? undefined}
        aria-valuetext={clamped == null ? "No score" : `${clamped.toFixed(0)}`}
        className="h-1.5 min-w-14 flex-1 overflow-hidden rounded-full bg-muted"
      >
        {clamped != null ? (
          <div
            className={cn("h-full rounded-full transition-all", TRACK_TONE[tone])}
            style={{ width: `${clamped}%` }}
          />
        ) : null}
      </div>
      {label ? (
        <span className="w-11 shrink-0 text-right text-xs font-semibold tabular-nums">
          {label}
        </span>
      ) : null}
    </div>
  );
}
