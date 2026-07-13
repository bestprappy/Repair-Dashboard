import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MetricAccent = "blue" | "green" | "amber" | "teal";

const ACCENT_CHIP: Record<MetricAccent, string> = {
  blue: "bg-info/12 text-info",
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
}

/** Reusable KPI tile: tinted icon chip, label, prominent value, optional sub. */
export function MetricCard({
  label,
  value,
  sub,
  accent = "blue",
  icon: Icon,
  compactValue = false,
}: MetricCardProps) {
  return (
    <Card className="gap-3 rounded-2xl px-5 py-4 shadow-sm ring-foreground/5">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              ACCENT_CHIP[accent],
            )}
          >
            <Icon className="size-4.5" />
          </span>
        ) : null}
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      </div>
      <div className="flex items-end justify-between gap-2">
        <p
          className={cn(
            "font-heading font-bold leading-none tracking-tight tabular-nums",
            compactValue ? "text-lg" : "text-[26px]",
          )}
        >
          {value}
        </p>
        {sub ? (
          <p className="pb-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {sub}
          </p>
        ) : null}
      </div>
    </Card>
  );
}
