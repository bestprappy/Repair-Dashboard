"use client";

import { ChartCard, SectionHeading } from "@/components/chart-card";

import { StatusBarChart, StatusPieChart } from "./charts";
import type { StatusDatum } from "../lib/selectors";

interface StatusOverviewSectionProps {
  title: string;
  statuses: StatusDatum[];
}

/** Side-by-side count bar chart and status-ratio donut. */
export function StatusOverviewSection({
  title,
  statuses,
}: StatusOverviewSectionProps) {
  return (
    <section className="mb-8">
      <SectionHeading>{title}</SectionHeading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Count by Status" height={300}>
          <StatusBarChart data={statuses} />
        </ChartCard>
        <ChartCard title="Status Ratio" height={300}>
          <StatusPieChart data={statuses} />
        </ChartCard>
      </div>
    </section>
  );
}
