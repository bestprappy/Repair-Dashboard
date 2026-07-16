import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MetricAccent = "blue" | "violet" | "green" | "amber" | "teal";

const ACCENT_CHIP: Record<MetricAccent, string> = {
  blue: "bg-primary/10 text-primary",
  violet: "bg-[#7c5cf5]/10 text-[#7455e8] dark:text-[#a88fff]",
  green: "bg-success/12 text-success",
  amber: "bg-warning/12 text-warning",
  teal: "bg-[#14b8a6]/12 text-[#14b8a6]",
};

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: MetricAccent;
  icon?: LucideIcon;
  /** Render the value smaller (e.g. a long status name). */
  compactValue?: boolean;
  /** Adds a restrained brand marker to the lead KPI. */
  featured?: boolean;
}

/** Reusable KPI tile: tinted icon chip, label, prominent value, optional sub. */
export function MetricCard({
  label,
  value,
  sub,
  accent = "blue",
  icon: Icon,
  compactValue = false,
  featured = false,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "relative gap-4 overflow-hidden rounded-xl border border-border/80 px-5 py-5 shadow-xs ring-0 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md",
        featured && "after:absolute after:inset-x-0 after:top-0 after:h-0.5 after:brand-gradient",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              ACCENT_CHIP[accent],
            )}
          >
            <Icon className="size-4" strokeWidth={1.8} />
          </span>
        ) : null}
      </div>
      <div>
        <p
          className={cn(
            "font-heading font-semibold leading-none tracking-[-0.035em] tabular-nums",
            compactValue ? "truncate text-xl" : "text-[28px] sm:text-[30px]",
          )}
          title={compactValue ? value : undefined}
        >
          {value}
        </p>
        {sub ? (
          <p className="mt-2 truncate text-xs font-medium tabular-nums text-muted-foreground">
            {sub}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
