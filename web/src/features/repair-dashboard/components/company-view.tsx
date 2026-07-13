"use client";

import { Activity, Banknote, CircleCheck, FileStack } from "lucide-react";

import { MetricCard } from "@/components/metric-card";

import { GroupCountSection } from "./group-count-section";
import { MonthlyGroupSection } from "./monthly-group-section";
import { StatusOverviewSection } from "./status-overview-section";
import { formatYM } from "../lib/transform";
import { selectCompany } from "../lib/selectors";
import type { RepairDataset } from "../lib/types";

interface CompanyViewProps {
  dataset: RepairDataset;
  company: string;
}

/** Detailed dashboard for a single company. */
export function CompanyView({ dataset, company }: CompanyViewProps) {
  const view = selectCompany(dataset, company);
  const monthLabels = dataset.allMonths.map(formatYM);

  if (!view) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No data for “{company}”.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-7 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <MetricCard
          label="Total Records"
          value={view.totalRecords.toLocaleString()}
          accent="blue"
          icon={FileStack}
        />
        <MetricCard
          label="Total Amount"
          value={`฿${view.totalAmount.toLocaleString()}`}
          accent="teal"
          icon={Banknote}
        />
        <MetricCard
          label="Pass Rate"
          value={`${view.passRate.toFixed(1)}%`}
          accent="blue"
          icon={CircleCheck}
        />
        <MetricCard
          label="Top Status"
          value={view.topStatus?.status ?? "—"}
          sub={`${(view.topStatus?.count ?? 0).toLocaleString()} cases`}
          accent="amber"
          icon={Activity}
          compactValue
        />
      </div>

      <StatusOverviewSection title="Status Overview" statuses={view.statuses} />
      <GroupCountSection
        data={view.data}
        allStatuses={dataset.allStatuses}
        activeStatuses={view.activeStatuses}
      />
      <MonthlyGroupSection
        title="Monthly Amount by Group"
        monthLabels={monthLabels}
        groups={view.groups}
      />
    </div>
  );
}
