"use client";

import { useMemo } from "react";

import { Activity, Banknote, CircleCheck, FileStack } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { MetricCard } from "@/components/metric-card";

import { CauseSection } from "./cause-section";
import { EquipmentBreakdownSection } from "./equipment-breakdown-section";
import { GroupCountSection } from "./group-count-section";
import { MonthlyGroupSection } from "./monthly-group-section";
import { MonthlyStatusSection } from "./monthly-status-section";
import { StatusOverviewSection } from "./status-overview-section";
import { selectBreakdown, selectCompany } from "../lib/selectors";
import { formatCurrency, formatYM } from "../lib/transform";
import type { RepairDataset } from "../lib/types";

interface CompanyViewProps {
  dataset: RepairDataset;
  company: string;
}

/** Detailed operational dashboard for a single repair company. */
export function CompanyView({ dataset, company }: CompanyViewProps) {
  const view = useMemo(() => selectCompany(dataset, company), [dataset, company]);
  const breakdown = useMemo(
    () => selectBreakdown(dataset, company),
    [dataset, company],
  );
  const monthLabels = dataset.allMonths.map(formatYM);

  if (!view) {
    return (
      <div className="rounded-xl border bg-card py-14 text-center text-sm text-muted-foreground">
        No repair data is available for “{company}”.
      </div>
    );
  }

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Company performance"
        title={company}
        description="Review repair throughput, completion quality, equipment demand, and reported failure causes for this company."
        months={dataset.allMonths}
        meta={`${view.activeStatuses.length} active statuses`}
      />

      <div className="mb-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total repair records"
          value={view.totalRecords.toLocaleString()}
          accent="blue"
          icon={FileStack}
          featured
        />
        <MetricCard
          label="Total repair amount"
          value={formatCurrency(view.totalAmount)}
          accent="violet"
          icon={Banknote}
        />
        <MetricCard
          label="Completed pass rate"
          value={`${view.passRate.toFixed(1)}%`}
          sub="PASS ÷ completed repairs"
          accent="green"
          icon={CircleCheck}
        />
        <MetricCard
          label="Most common status"
          value={view.topStatus?.status ?? "—"}
          sub={`${(view.topStatus?.count ?? 0).toLocaleString()} records`}
          accent="violet"
          icon={Activity}
          compactValue
        />
      </div>

      <MonthlyStatusSection
        title="Repair volume over time"
        monthLabels={monthLabels}
        view={breakdown}
      />
      <StatusOverviewSection title="Current status mix" statuses={view.statuses} />
      <GroupCountSection
        data={view.data}
        allStatuses={dataset.allStatuses}
        activeStatuses={view.activeStatuses}
      />
      <EquipmentBreakdownSection view={breakdown} />
      <CauseSection view={breakdown} />
      <MonthlyGroupSection
        title="Repair amount by equipment group"
        monthLabels={monthLabels}
        groups={view.groups}
      />
    </div>
  );
}
