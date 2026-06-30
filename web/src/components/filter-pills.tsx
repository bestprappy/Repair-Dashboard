"use client";

import { cn } from "@/lib/utils";

interface FilterPillsProps {
  label: string;
  options: string[];
  /** Currently selected option, or null when "show all". */
  value: string | null;
  /** Toggle handler: passing the active value clears the filter. */
  onChange: (next: string | null) => void;
}

/** Single-select pill strip; clicking the active pill clears the selection. */
export function FilterPills({ label, options, value, onChange }: FilterPillsProps) {
  if (options.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : option)}
            className={cn(
              "cursor-pointer rounded-full border px-3.5 py-1 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted/60 text-muted-foreground hover:border-primary hover:text-primary",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
