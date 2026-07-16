"use client";

import { ChartCard, SectionHeading } from "@/components/chart-card";

import { StatusMonthlyStackChart } from "./charts";
import type { BreakdownView } from "../lib/selectors";

interface MonthlyStatusSectionProps {
  title: string;
  monthLabels: string[];
  view: BreakdownView;
}

/** Full-width stacked bars of monthly repair volume split by status. */
export function MonthlyStatusSection({
  title,
  monthLabels,
  view,
}: MonthlyStatusSectionProps) {
  if (view.statusMonthly.length === 0 || monthLabels.length === 0) return null;

  return (
    <section className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <ChartCard
        title="Monthly repair records by status"
        subtitle="Each column is split by the workflow status reported in the source sheet."
        height={340}
      >
        <StatusMonthlyStackChart
          labels={monthLabels}
          series={view.statusMonthly}
          monthTotals={view.monthTotals}
        />
      </ChartCard>
    </section>
  );
}
