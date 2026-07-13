"use client";

import { ChartCard, SectionHeading } from "@/components/chart-card";

import { CompanyStatBarChart } from "./charts";
import { paletteColor } from "../lib/transform";
import type { CompanyStatDatum } from "../lib/selectors";

interface CompanyComparisonSectionProps {
  companyStats: CompanyStatDatum[];
}

/** Rough per-company row height so the bars stay legible as companies grow. */
const ROW_HEIGHT = 32;
const MIN_HEIGHT = 260;

/**
 * Side-by-side company comparison: total repair volume and PASS rate.
 * PASS rate is sorted independently so the best performers read top-down.
 */
export function CompanyComparisonSection({
  companyStats,
}: CompanyComparisonSectionProps) {
  if (companyStats.length === 0) return null;

  const height = Math.max(MIN_HEIGHT, companyStats.length * ROW_HEIGHT + 40);
  const byPassRate = [...companyStats].sort((a, b) => b.passRate - a.passRate);

  return (
    <section className="mb-8">
      <SectionHeading>Company Comparison</SectionHeading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Total Repairs by Company" height={height}>
          <CompanyStatBarChart
            data={companyStats}
            metric="total"
            color={paletteColor(0)}
          />
        </ChartCard>
        <ChartCard title="PASS Rate by Company" height={height}>
          <CompanyStatBarChart
            data={byPassRate}
            metric="passRate"
            color="var(--primary)"
          />
        </ChartCard>
      </div>
    </section>
  );
}
