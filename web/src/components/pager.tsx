"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PagerProps {
  /** Current page, zero-indexed. */
  page: number;
  /** Total number of pages (>= 1). */
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Accessible name for the control group, e.g. "Model pages". */
  label: string;
  className?: string;
}

/**
 * Compact previous/next pager with a "Page X / Y" readout. Reusable across
 * any paged list; page state is owned by the parent.
 */
export function Pager({
  page,
  pageCount,
  onPageChange,
  label,
  className,
}: PagerProps) {
  const safeCount = Math.max(1, pageCount);
  const canPrev = page > 0;
  const canNext = page < safeCount - 1;

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex items-center gap-1.5", className)}
    >
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Previous page"
        disabled={!canPrev}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </Button>
      <span
        aria-live="polite"
        className="min-w-16 text-center text-xs tabular-nums text-muted-foreground"
      >
        Page {page + 1} / {safeCount}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Next page"
        disabled={!canNext}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRightIcon aria-hidden="true" />
      </Button>
    </div>
  );
}
