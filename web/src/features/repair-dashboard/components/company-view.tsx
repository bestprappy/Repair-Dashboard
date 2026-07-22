"use client";

import { useMemo } from "react";

import { useAtomValue } from "jotai";
import { Activity, Banknote, CircleCheck, FileStack } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { MetricCard } from "@/components/metric-card";

import { CauseSection } from "./cause-section";
import { DateRangeControl } from "./date-range-control";
import { EquipmentBreakdownSection } from "./equipment-breakdown-section";
import { GroupCountSection } from "./group-count-section";
import { MonthlyGroupSection } from "./monthly-group-section";
import { RepairDemandSection } from "./repair-demand-section";
import { StatusOverviewSection } from "./status-overview-section";
import { WorkflowFlowSection } from "./workflow-flow-section";
import {
  selectBreakdown,
  selectCompany,
  selectRepairDemand,
} from "../lib/selectors";
import { formatCurrency, formatYM } from "../lib/transform";
import type { RepairDataset } from "../lib/types";
import { selectWorkflowFlows } from "../lib/workflow-flow";
import {
  filteredDatasetAtom,
  filteredRowsAtom,
  mappingAtom,
  rawRowsAtom,
} from "../state/atoms";

interface CompanyViewProps {
  dataset: RepairDataset;
  company: string;
}

/** Detailed operational dashboard for a single repair company. */
export function CompanyView({ dataset, company }: CompanyViewProps) {
  const rows = useAtomValue(rawRowsAtom);
  const mapping = useAtomValue(mappingAtom);
  const filteredRows = useAtomValue(filteredRowsAtom);
  const filteredDataset = useAtomValue(filteredDatasetAtom) ?? dataset;
  const view = useMemo(
    () => selectCompany(filteredDataset, company),
    [filteredDataset, company],
  );
  const breakdown = useMemo(
    () => selectBreakdown(filteredDataset, company),
    [filteredDataset, company],
  );
  const repairDemand = useMemo(
    () => selectRepairDemand(filteredDataset, company),
    [filteredDataset, company],
  );
  const workflowFlows = useMemo(
    () => selectWorkflowFlows(filteredRows, rows, mapping, company),
    [filteredRows, rows, mapping, company],
  );
  const monthLabels = filteredDataset.allMonths.map(formatYM);

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
        months={filteredDataset.allMonths}
        dateControl={
          <DateRangeControl
            availableMonths={dataset.allMonths}
            disabled={!mapping.ym}
          />
        }
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

      <RepairDemandSection monthLabels={monthLabels} view={repairDemand} />
      <StatusOverviewSection
        title="Current status mix"
        statuses={view.statuses}
      />
      <WorkflowFlowSection flows={workflowFlows} />
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
