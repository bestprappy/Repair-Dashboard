"use client";

import { ChartCard, SectionHeading } from "@/components/chart-card";

import { RankBarChart } from "./charts";
import { paletteColor } from "../lib/transform";
import type { BreakdownView } from "../lib/selectors";

const ROW_HEIGHT = 30;
const MIN_HEIGHT = 220;

function rankHeight(items: number): number {
  return Math.max(MIN_HEIGHT, items * ROW_HEIGHT + 50);
}

function coverageNote(pct: number): string {
  return `Reported on ${pct.toFixed(0)}% of records`;
}

/** Top cause / sub-cause bars (the columns are sparsely filled). */
export function CauseSection({ view }: { view: BreakdownView }) {
  const hasCauses = view.topCauses.length > 0;
  const hasSubCauses = view.topSubCauses.length > 0;
  if (!hasCauses && !hasSubCauses) return null;

  return (
    <section className="mb-10">
      <SectionHeading>Reported failure causes</SectionHeading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {hasCauses ? (
          <ChartCard
            title="Primary causes"
            subtitle={coverageNote(view.causeCoveragePct)}
            height={rankHeight(view.topCauses.length)}
          >
            <RankBarChart
              data={view.topCauses}
              color={paletteColor(5)}
              name="Records"
            />
          </ChartCard>
        ) : null}
        {hasSubCauses ? (
          <ChartCard
            title="Detailed causes"
            subtitle={coverageNote(view.subCauseCoveragePct)}
            height={rankHeight(view.topSubCauses.length)}
          >
            <RankBarChart
              data={view.topSubCauses}
              color={paletteColor(6)}
              name="Records"
            />
          </ChartCard>
        ) : null}
      </div>
    </section>
  );
}
