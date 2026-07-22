"use client";

import { useState } from "react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import { RankBarChart } from "./charts";
import { paletteColor } from "../lib/transform";
import type { BreakdownView } from "../lib/selectors";

const ROW_HEIGHT = 30;
const MIN_HEIGHT = 220;

type CauseMode = "primary" | "detailed";

function rankHeight(items: number): number {
  return Math.max(MIN_HEIGHT, items * ROW_HEIGHT + 50);
}

function coverageNote(pct: number): string {
  return `Reported on ${pct.toFixed(0)}% of records`;
}

/** Full-width cause chart that toggles between primary and detailed causes. */
export function CauseSection({ view }: { view: BreakdownView }) {
  const hasCauses = view.topCauses.length > 0;
  const hasSubCauses = view.topSubCauses.length > 0;
  const [mode, setMode] = useState<CauseMode>("primary");

  if (!hasCauses && !hasSubCauses) return null;

  // If only one dataset exists, lock the view to whichever is available so the
  // toggle never lands on an empty chart.
  const effectiveMode: CauseMode = !hasCauses
    ? "detailed"
    : !hasSubCauses
      ? "primary"
      : mode;

  const isDetailed = effectiveMode === "detailed";
  const data = isDetailed ? view.topSubCauses : view.topCauses;
  const coveragePct = isDetailed
    ? view.subCauseCoveragePct
    : view.causeCoveragePct;
  const canToggle = hasCauses && hasSubCauses;

  return (
    <section className="mb-10">
      <SectionHeading>Reported failure causes</SectionHeading>
      <ChartCard
        title={isDetailed ? "Detailed causes" : "Primary causes"}
        subtitle={coverageNote(coveragePct)}
        height={rankHeight(data.length)}
        action={
          canToggle ? (
            <ToggleGroup
              value={[effectiveMode]}
              onValueChange={(value) => {
                const next = value[0] as CauseMode | undefined;
                if (next) setMode(next);
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Choose cause detail level"
            >
              <ToggleGroupItem value="primary" aria-label="Show primary causes">
                Primary
              </ToggleGroupItem>
              <ToggleGroupItem
                value="detailed"
                aria-label="Show detailed causes"
              >
                Detailed
              </ToggleGroupItem>
            </ToggleGroup>
          ) : null
        }
      >
        <RankBarChart
          data={data}
          color={paletteColor(isDetailed ? 6 : 5)}
          name="Records"
        />
      </ChartCard>
    </section>
  );
}
