"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { useAtomValue, useSetAtom } from "jotai";
import {
  Award,
  CalendarCheck,
  FileStack,
  Gauge,
  Search,
  Trophy,
} from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { MetricCard } from "@/components/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { DateRangeControl } from "./date-range-control";
import { VendorScorecardTable } from "./vendor-scorecard-table";
import { filterAnalyzedRows } from "../lib/insights";
import { selectVendorScorecard } from "../lib/scorecard";
import type { RepairDataset } from "../lib/types";
import {
  filteredRowsAtom,
  mappingAtom,
  viewAtom,
} from "../state/atoms";

const DEFAULT_SLA_TARGET = 30;

/** Ranked vendor scorecard: one composite grade per servicing company. */
export function VendorScorecardView({ dataset }: { dataset: RepairDataset }) {
  const filteredRows = useAtomValue(filteredRowsAtom);
  const mapping = useAtomValue(mappingAtom);
  const setView = useSetAtom(viewAtom);

  const [target, setTarget] = useState(DEFAULT_SLA_TARGET);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const analyzedRows = useMemo(
    () => filterAnalyzedRows(filteredRows, mapping),
    [filteredRows, mapping],
  );
  const scorecard = useMemo(
    () => selectVendorScorecard(analyzedRows, mapping, target),
    [analyzedRows, mapping, target],
  );

  const filteredVendors = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return scorecard.vendors;
    return scorecard.vendors.filter((vendor) =>
      vendor.company.toLowerCase().includes(needle),
    );
  }, [scorecard.vendors, deferredQuery]);

  const best = scorecard.bestVendor;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Vendor performance"
        title="Vendor scorecard"
        description="Every servicing company graded on a single composite of completion quality and SLA compliance, with repeat-repair and cost shown as context. Select a vendor to open its full view."
        months={dataset.allMonths}
        dateControl={
          <DateRangeControl
            availableMonths={dataset.allMonths}
            disabled={!mapping.ym}
          />
        }
        meta={`${scorecard.eligibleCount} graded of ${scorecard.vendors.length} vendors`}
      />

      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Top vendor"
          value={best ? best.company : "—"}
          sub={
            best && best.compositeScore != null
              ? `Grade ${best.grade} · ${best.compositeScore.toFixed(0)}/100 composite`
              : "No vendor has enough evidence"
          }
          accent="green"
          icon={Trophy}
          compactValue
          featured
        />
        <MetricCard
          label="Graded vendors"
          value={scorecard.eligibleCount.toLocaleString()}
          sub={`≥ ${scorecard.minimumVerdicts} completed verdicts`}
          accent="blue"
          icon={Award}
        />
        <MetricCard
          label="Median SLA compliance"
          value={
            !scorecard.slaAvailable || scorecard.medianCompliancePct == null
              ? "—"
              : `${scorecard.medianCompliancePct.toFixed(1)}%`
          }
          sub={
            scorecard.slaAvailable
              ? `Within ${scorecard.targetDays}-day target`
              : "Map lifecycle date & stage"
          }
          accent="amber"
          icon={CalendarCheck}
        />
        <MetricCard
          label="Repair records"
          value={scorecard.totalRecords.toLocaleString()}
          sub={`${scorecard.vendors.length.toLocaleString()} servicing companies`}
          accent="violet"
          icon={FileStack}
        />
      </div>

      <Card className="gap-4 rounded-xl border border-border/80 py-5 shadow-xs">
        <CardHeader className="px-5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-[15px] font-semibold tracking-[-0.01em]">
                Vendor rankings
              </CardTitle>
              <CardDescription className="mt-1 text-xs leading-5">
                Composite = {(scorecard.weights.quality * 100).toFixed(0)}%
                PASS quality + {(scorecard.weights.sla * 100).toFixed(0)}% SLA
                compliance. Ranked by composite; ties break on completed
                verdicts.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <label htmlFor="vendor-search" className="sr-only">
                  Search vendors
                </label>
                <Input
                  id="vendor-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search vendors…"
                  className="w-full pl-9 sm:w-52"
                />
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                SLA target
                <Input
                  className="w-16"
                  type="number"
                  min={1}
                  max={365}
                  value={target}
                  onChange={(event) =>
                    setTarget(
                      Math.max(
                        1,
                        Math.min(365, Number(event.target.value) || 1),
                      ),
                    )
                  }
                  aria-label="SLA target in days"
                />
                days
              </label>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {scorecard.vendors.length === 0 ? (
            <EmptyState
              icon={Gauge}
              title="No vendor records"
              message="No servicing companies were found in the current dataset. Check that the Company column is mapped correctly."
            />
          ) : filteredVendors.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No vendors match"
              message={`Nothing matches “${query}”. Clear the search to see every vendor.`}
            />
          ) : (
            <VendorScorecardTable
              vendors={filteredVendors}
              slaAvailable={scorecard.slaAvailable}
              repeatAvailable={scorecard.repeatAvailable}
              costAvailable={scorecard.costAvailable}
              minimumVerdicts={scorecard.minimumVerdicts}
              onSelectVendor={setView}
            />
          )}
        </CardContent>
      </Card>

      <p className="mt-4 max-w-4xl text-[11px] leading-5 text-muted-foreground">
        Method: PASS quality is the 95% Wilson lower bound of completed PASS /
        (PASS + NOT PASS), so small samples cannot top the table on a perfect
        streak. Only vendors with at least {scorecard.minimumVerdicts} completed
        verdicts are graded; the rest are listed below the divider without a
        grade. SLA compliance is the share of input-to-output cycles closed
        within {scorecard.targetDays} days and counts toward the grade only when
        a vendor has at least five completed cycles. Repeat rate and median
        amount are descriptive context and never change the ranking. Verdicts
        and amounts are read from output rows; intake rows are excluded.
      </p>
    </div>
  );
}

interface EmptyStateProps {
  icon: typeof Gauge;
  title: string;
  message: string;
}

function EmptyState({ icon: Icon, title, message }: EmptyStateProps) {
  return (
    <div className="px-5 py-12 text-center sm:px-6">
      <Icon
        className="mx-auto size-7 text-muted-foreground"
        aria-hidden="true"
      />
      <h3 className="mt-3 font-heading text-sm font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
