import { cn } from "@/lib/utils";

import type { ScorecardGrade } from "../lib/scorecard";
import type { ScoreMeterTone } from "@/components/score-meter";

const GRADE_STYLE: Record<ScorecardGrade, string> = {
  A: "border-success/30 bg-success/12 text-success",
  B: "border-success/25 bg-success/10 text-success",
  C: "border-warning/30 bg-warning/12 text-warning",
  D: "border-warning/30 bg-warning/12 text-warning",
  F: "border-error/30 bg-error/12 text-error",
};

const GRADE_TONE: Record<ScorecardGrade, ScoreMeterTone> = {
  A: "good",
  B: "good",
  C: "warning",
  D: "warning",
  F: "bad",
};

/** Meter tone that matches a grade's color, for a consistent row read. */
export function gradeTone(grade: ScorecardGrade | null): ScoreMeterTone {
  return grade ? GRADE_TONE[grade] : "neutral";
}

interface GradeBadgeProps {
  grade: ScorecardGrade | null;
  size?: "sm" | "lg";
  className?: string;
}

/** Square letter-grade pill for a vendor's composite score. */
export function GradeBadge({ grade, size = "sm", className }: GradeBadgeProps) {
  if (!grade) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-border bg-muted font-semibold text-muted-foreground",
          size === "lg" ? "size-9 text-base" : "size-6 text-[11px]",
          className,
        )}
        aria-label="No grade"
        title="Not enough evidence to grade"
      >
        –
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-heading font-semibold tabular-nums",
        GRADE_STYLE[grade],
        size === "lg" ? "size-9 text-lg" : "size-6 text-xs",
        className,
      )}
      aria-label={`Grade ${grade}`}
    >
      {grade}
    </span>
  );
}
