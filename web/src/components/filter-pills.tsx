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
    <div className="mb-4 flex max-w-full items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <span className="mr-0.5 shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <button
        type="button"
        aria-pressed={value === null}
        onClick={() => onChange(null)}
        className={cn(
          "h-8 shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value === null
            ? "border-primary/20 bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
        )}
      >
        All
      </button>
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : option)}
            className={cn(
              "h-8 shrink-0 cursor-pointer rounded-lg border px-3 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
