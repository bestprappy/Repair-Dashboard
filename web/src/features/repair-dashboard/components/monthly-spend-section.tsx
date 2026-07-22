"use client";

import { ChartCard, SectionHeading } from "@/components/chart-card";

import { MonthlySpendChart } from "./charts";
import type { MonthlySpendView } from "../lib/selectors";
import { formatCurrency } from "../lib/transform";

interface MonthlySpendSectionProps {
  monthLabels: string[];
  view: MonthlySpendView;
}

/** Monthly repair spend for the overview and individual company pages. */
export function MonthlySpendSection({
  monthLabels,
  view,
}: MonthlySpendSectionProps) {
  return (
    <section className="mb-10">
      <SectionHeading>Monthly repair spend</SectionHeading>
      <ChartCard
        title="REPAIR SPEND by month"
        subtitle="Each bar shows the total positive repair amount reported for that month. Months with no reported spend remain visible as zero."
        action={
          <dl
            className="flex flex-wrap justify-end gap-x-4 gap-y-1 text-[11px]"
            aria-label="Monthly repair spend statistics"
          >
            <div className="flex items-center gap-1.5">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatCurrency(view.total)}
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="text-muted-foreground">Monthly average</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {view.average == null ? "—" : formatCurrency(view.average)}
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
            No positive repair amounts with a valid month are available for
            this period.
          </div>
        ) : (
          <MonthlySpendChart labels={monthLabels} values={view.values} />
        )}
      </ChartCard>
    </section>
  );
}
