"use client";

import { ChartCard, SectionHeading } from "@/components/chart-card";

import { StatusPieChart } from "./charts";
import type { StatusDatum } from "../lib/selectors";

interface StatusOverviewSectionProps {
  title: string;
  statuses: StatusDatum[];
}

/** Status-ratio donut summarizing the share of each repair record status. */
export function StatusOverviewSection({
  title,
  statuses,
}: StatusOverviewSectionProps) {
  return (
    <section className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <ChartCard title="Share of repair records" height={300}>
        <StatusPieChart data={statuses} />
      </ChartCard>
    </section>
  );
}
