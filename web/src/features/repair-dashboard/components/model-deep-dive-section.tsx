"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Banknote, Building2, CircleCheck, FileStack, Search } from "lucide-react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import { FilterPills } from "@/components/filter-pills";
import { MetricCard } from "@/components/metric-card";
import { Input } from "@/components/ui/input";

import { MonthlyBarChart, RankBarChart, StatusPieChart } from "./charts";
import { rankModels, selectModelDetail } from "../lib/insights";
import { formatCurrency, paletteColor } from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";

const MATCH_LIMIT = 8;

interface ModelDeepDiveSectionProps {
  rows: CsvRow[];
  mapping: ColumnMapping;
}

/** Search a model, then inspect its KPIs, monthly volume, statuses, causes. */
export function ModelDeepDiveSection({ rows, mapping }: ModelDeepDiveSectionProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const matches = useMemo(
    () => rankModels(rows, mapping, deferredQuery, MATCH_LIMIT),
    [rows, mapping, deferredQuery],
  );
  const model = selected ?? matches[0]?.label ?? null;
  const detail = useMemo(
    () => (model ? selectModelDetail(rows, mapping, model) : null),
    [rows, mapping, model],
  );

  if (!mapping.model) return null;

  return (
    <section className="mb-10">
      <SectionHeading>Model deep dive</SectionHeading>

      <div className="relative mb-4 max-w-md">
        <label htmlFor="model-search" className="sr-only">
          Search models
        </label>
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="model-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search models, e.g. R4850G2…"
          className="pl-9"
        />
      </div>
      <FilterPills
        label="Model:"
        options={matches.map((match) => match.label)}
        value={model}
        onChange={setSelected}
      />

      {detail ? (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Repairs"
              value={detail.total.toLocaleString()}
              accent="blue"
              icon={FileStack}
            />
            <MetricCard
              label="Pass Rate"
              value={
                detail.passRate == null ? "—" : `${detail.passRate.toFixed(1)}%`
              }
              sub={`${detail.completed.toLocaleString()} completed`}
              accent="green"
              icon={CircleCheck}
            />
            <MetricCard
              label="Avg Cost"
              value={
                detail.avgCost == null
                  ? "—"
                  : formatCurrency(detail.avgCost)
              }
              sub={`${detail.costCount.toLocaleString()} priced rows`}
              accent="violet"
              icon={Banknote}
            />
            <MetricCard
              label="Companies"
              value={detail.companyCount.toLocaleString()}
              accent="blue"
              icon={Building2}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Monthly repair volume" height={260}>
              <MonthlyBarChart
                labels={detail.monthLabels}
                values={detail.monthlyCounts}
                color={paletteColor(0)}
                format="count"
              />
            </ChartCard>
            <ChartCard title="Status split" height={260}>
              <StatusPieChart data={detail.statuses} />
            </ChartCard>
            {detail.topCauses.length > 0 ? (
              <ChartCard title="Top causes for this model" height={260}>
                <RankBarChart
                  data={detail.topCauses}
                  color={paletteColor(5)}
                  name="Records"
                />
              </ChartCard>
            ) : null}
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No model matches “{query}”.
        </p>
      )}
    </section>
  );
}
