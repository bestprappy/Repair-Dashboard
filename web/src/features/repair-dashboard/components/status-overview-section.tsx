"use client";

import { ChartCard, SectionHeading } from "@/components/chart-card";

import { StatusPieChart } from "./charts";
import type { StatusDatum } from "../lib/selectors";
import { isExcludedTabSheet, readColumn } from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";

interface StatusOverviewSectionProps {
  title: string;
  statuses: StatusDatum[];
  rows: CsvRow[];
  mapping: ColumnMapping;
  company?: string;
}

const OUTPUT_STATUSES = ["PASS", "NOT PASS", "CLAIM", "NO FAULT FOUND"] as const;
const OUTPUT_CHART_STATUSES = [...OUTPUT_STATUSES, "ERROR"] as const;

function statusDatum(status: string, count: number, total: number): StatusDatum {
  return {
    status,
    count,
    pct: total > 0 ? (count / total) * 100 : 0,
  };
}

/** Split intake records from output outcomes and group unknown outcomes as ERROR. */
function splitLifecycleStatuses(
  statuses: StatusDatum[],
  rows: CsvRow[],
  mapping: ColumnMapping,
  company?: string,
) {
  if (mapping.tabSheet) {
    const inputCounts = { REPAIR: 0, CLAIM: 0 };
    const outputCounts: Record<(typeof OUTPUT_STATUSES)[number] | "ERROR", number> = {
      PASS: 0,
      "NOT PASS": 0,
      CLAIM: 0,
      "NO FAULT FOUND": 0,
      ERROR: 0,
    };

    for (const row of rows) {
      if (company && readColumn(row, mapping.company) !== company) continue;
      const stage = readColumn(row, mapping.tabSheet);
      if (isExcludedTabSheet(stage)) continue;
      const status = readColumn(row, mapping.status).trim().toUpperCase();

      if (/input/i.test(stage)) {
        if (/CLAIM/.test(status)) inputCounts.CLAIM += 1;
        else if (status === "REPAIR") inputCounts.REPAIR += 1;
        continue;
      }
      if (!/output/i.test(stage)) continue;

      if (status === "PASS") outputCounts.PASS += 1;
      else if (/NOT[\s_-]*PASS|NOTPASS/.test(status)) outputCounts["NOT PASS"] += 1;
      else if (/CLAIM/.test(status)) outputCounts.CLAIM += 1;
      else if (/NO[\s_-]*FAULT|\bNFF\b/.test(status)) outputCounts["NO FAULT FOUND"] += 1;
      else outputCounts.ERROR += 1;
    }

    const inputTotal = inputCounts.REPAIR + inputCounts.CLAIM;
    const outputTotal = Object.values(outputCounts).reduce((sum, count) => sum + count, 0);
    return {
      input: [
        statusDatum("REPAIR", inputCounts.REPAIR, inputTotal),
        statusDatum("CLAIM", inputCounts.CLAIM, inputTotal),
      ],
      output: OUTPUT_CHART_STATUSES.map((status) =>
        statusDatum(status, outputCounts[status], outputTotal),
      ),
    };
  }

  // Legacy uploads without a workflow-stage column cannot distinguish a claim
  // input from a claim output, so retain the overview's established split.
  const counts = new Map(statuses.map(({ status, count }) => [status.toUpperCase(), count]));
  const inputCount = counts.get("REPAIR") ?? 0;
  const outputTotal = statuses.reduce(
    (total, { status, count }) => total + (status.toUpperCase() === "REPAIR" ? 0 : count),
    0,
  );
  const namedOutputTotal = OUTPUT_STATUSES.reduce(
    (total, status) => total + (counts.get(status) ?? 0),
    0,
  );

  return {
    input: [statusDatum("REPAIR", inputCount, inputCount)],
    output: [
      ...OUTPUT_STATUSES.map((status) =>
        statusDatum(status, counts.get(status) ?? 0, outputTotal),
      ),
      statusDatum("ERROR", Math.max(0, outputTotal - namedOutputTotal), outputTotal),
    ],
  };
}

/** Separate donuts for repair inputs and their output status distribution. */
export function StatusOverviewSection({
  title,
  statuses,
  rows,
  mapping,
  company,
}: StatusOverviewSectionProps) {
  const lifecycle = splitLifecycleStatuses(statuses, rows, mapping, company);

  return (
    <section className="mb-10">
      <SectionHeading>{title}</SectionHeading>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Sent" height={300}>
          <StatusPieChart data={lifecycle.input} />
        </ChartCard>
        <ChartCard
          title="Receive"
          subtitle="All other output statuses are grouped as ERROR."
          height={300}
        >
          <StatusPieChart data={lifecycle.output} />
        </ChartCard>
      </div>
    </section>
  );
}
