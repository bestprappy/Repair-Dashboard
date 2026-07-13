"use client";

import { useState } from "react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import { FilterPills } from "@/components/filter-pills";

import { GroupCountChart } from "./charts";
import { statusColor } from "../lib/transform";
import { selectStatusGroups } from "../lib/selectors";
import type { CompanyData } from "../lib/types";

interface GroupCountSectionProps {
  data: CompanyData;
  /** All statuses in dataset order (for stable colors). */
  allStatuses: string[];
  /** Statuses with at least one record. */
  activeStatuses: string[];
}

/** Group counts broken down per status, with a single-select status filter. */
export function GroupCountSection({
  data,
  allStatuses,
  activeStatuses,
}: GroupCountSectionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const visible = selected
    ? activeStatuses.filter((status) => status === selected)
    : activeStatuses;

  const cards = visible
    .map((status) => ({
      status,
      color: statusColor(status, allStatuses.indexOf(status)),
      groups: selectStatusGroups(data, status),
    }))
    .filter((card) => card.groups.length > 0);

  return (
    <section className="mb-8">
      <SectionHeading>Group Count by Status</SectionHeading>
      <FilterPills
        label="Status:"
        options={activeStatuses}
        value={selected}
        onChange={setSelected}
      />

      {cards.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No group data.
        </p>
      ) : selected ? (
        <div className="max-w-3xl">
          <ChartCard
            title={cards[0].status}
            height={Math.max(260, cards[0].groups.length * 38 + 80)}
          >
            <GroupCountChart data={cards[0].groups} color={cards[0].color} />
          </ChartCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cards.map((card) => (
            <ChartCard
              key={card.status}
              title={card.status}
              height={Math.max(200, card.groups.length * 36 + 70)}
            >
              <GroupCountChart data={card.groups} color={card.color} />
            </ChartCard>
          ))}
        </div>
      )}
    </section>
  );
}
