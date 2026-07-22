"use client";

import { ChartCard, SectionHeading } from "@/components/chart-card";

import { RepairDemandChart } from "./charts";
import type { RepairDemandView } from "../lib/selectors";

interface RepairDemandSectionProps {
  monthLabels: string[];
  view: RepairDemandView;
}

function formatStatistic(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}

/** Shared monthly demand chart for the overview and every company page. */
export function RepairDemandSection({
  monthLabels,
  view,
}: RepairDemandSectionProps) {
  return (
    <section className="mb-10">
      <SectionHeading>Monthly repair demand</SectionHeading>
      <ChartCard
        title="REPAIR inputs by month"
        subtitle="Each bar counts REPAIR intake records for that month. The mean and median across all displayed months are shown in the legend."
        action={
          <dl
            className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[11px]"
            aria-label="Monthly repair demand statistics"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full bg-info"
                aria-hidden="true"
              />
              <dt className="text-muted-foreground">Mean</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatStatistic(view.mean)}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full bg-warning"
                aria-hidden="true"
              />
              <dt className="text-muted-foreground">Median</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatStatistic(view.median)}
              </dd>
            </div>
          </dl>
        }
        height={340}
      >
        {monthLabels.length === 0 || view.total === 0 ? (
          <div
            className="flex h-full items-center justify-center rounded-lg bg-muted/30 px-6 text-center text-sm text-muted-foreground"
            role="status"
          >
            No REPAIR input records with a valid month are available for this
            period.
          </div>
        ) : (
          <RepairDemandChart labels={monthLabels} values={view.values} />
        )}
      </ChartCard>
    </section>
  );
}
