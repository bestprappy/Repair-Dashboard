"use client";

import { Banknote, Boxes, FileStack } from "lucide-react";

import { MetricCard } from "@/components/metric-card";

import { CompanyComparisonSection } from "./company-comparison-section";
import { MonthlyGroupSection } from "./monthly-group-section";
import { StatusOverviewSection } from "./status-overview-section";
import { formatYM } from "../lib/transform";
import { selectAllCompanies } from "../lib/selectors";
import type { RepairDataset } from "../lib/types";

/** Aggregate dashboard across every company. */
export function AllCompaniesView({ dataset }: { dataset: RepairDataset }) {
  const view = selectAllCompanies(dataset);
  const monthLabels = dataset.allMonths.map(formatYM);

  return (
    <div>
      <div className="mb-7 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        <MetricCard
          label="Total Records"
          value={view.grandTotal.toLocaleString()}
          sub={`${view.companyCount} companies`}
          accent="blue"
          icon={FileStack}
        />
        <MetricCard
          label="Total Amount"
          value={`฿${view.grandAmount.toLocaleString()}`}
          accent="teal"
          icon={Banknote}
        />
        <MetricCard
          label="Groups Tracked"
          value={view.groups.length.toLocaleString()}
          accent="amber"
          icon={Boxes}
        />
      </div>

      <StatusOverviewSection
        title="Overall Status Distribution (All Companies)"
        statuses={view.statuses}
      />
      <CompanyComparisonSection companyStats={view.companyStats} />
      <MonthlyGroupSection
        title="Monthly Total Amount by Group (All Companies)"
        monthLabels={monthLabels}
        groups={view.groups}
      />
    </div>
  );
}
