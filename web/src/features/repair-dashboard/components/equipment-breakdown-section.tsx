"use client";

import { ChartCard, SectionHeading } from "@/components/chart-card";

import { RankBarChart } from "./charts";
import { paletteColor } from "../lib/transform";
import type { BreakdownView } from "../lib/selectors";

/** Rough per-item row height so top-N bars stay legible. */
const ROW_HEIGHT = 30;
const MIN_HEIGHT = 220;

function rankHeight(items: number): number {
  return Math.max(MIN_HEIGHT, items * ROW_HEIGHT + 50);
}

/** Top repaired models and equipment groups, side by side. */
export function EquipmentBreakdownSection({ view }: { view: BreakdownView }) {
  const hasModels = view.topModels.length > 0;
  const hasGroups = view.topGroups.length > 0;
  if (!hasModels && !hasGroups) return null;

  return (
    <section className="mb-10">
      <SectionHeading>Equipment breakdown</SectionHeading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {hasModels ? (
          <ChartCard
            title="Most repaired models"
            height={rankHeight(view.topModels.length)}
          >
            <RankBarChart
              data={view.topModels}
              color={paletteColor(0)}
              name="Records"
            />
          </ChartCard>
        ) : null}
        {hasGroups ? (
          <ChartCard
            title="Most active equipment groups"
            height={rankHeight(view.topGroups.length)}
          >
            <RankBarChart
              data={view.topGroups}
              color={paletteColor(4)}
              name="Records"
            />
          </ChartCard>
        ) : null}
      </div>
    </section>
  );
}
