"use client";

import { useState } from "react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import { FilterPills } from "@/components/filter-pills";

import { MonthlyBarChart } from "./charts";
import { paletteColor } from "../lib/transform";
import type { GroupSeries } from "../lib/selectors";

interface MonthlyGroupSectionProps {
  title: string;
  monthLabels: string[];
  groups: GroupSeries[];
}

/** Monthly amount-by-group section with a single-select group filter. */
export function MonthlyGroupSection({
  title,
  monthLabels,
  groups,
}: MonthlyGroupSectionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const visible = selected
    ? groups.filter((group) => group.group === selected)
    : groups;

  return (
    <section className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <FilterPills
        label="Group:"
        options={groups.map((group) => group.group)}
        value={selected}
        onChange={setSelected}
      />

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No amount data.
        </p>
      ) : selected ? (
        <div className="w-full">
          <ChartCard title={visible[0].group} height={260}>
            <MonthlyBarChart
              labels={monthLabels}
              values={visible[0].values}
              color={paletteColor(
                groups.findIndex((group) => group.group === selected),
              )}
            />
          </ChartCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((group) => (
            <ChartCard key={group.group} title={group.group} height={200}>
              <MonthlyBarChart
                labels={monthLabels}
                values={group.values}
                color={paletteColor(
                  groups.findIndex((g) => g.group === group.group),
                )}
              />
            </ChartCard>
          ))}
        </div>
      )}
    </section>
  );
}
