"use client";

import { useMemo } from "react";

import { useAtomValue } from "jotai";
import { Banknote, Building2, CircleCheck, FileStack } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { MetricCard } from "@/components/metric-card";

import { CauseSection } from "./cause-section";
import { CompanyComparisonSection } from "./company-comparison-section";
import { DateRangeControl } from "./date-range-control";
import { EquipmentBreakdownSection } from "./equipment-breakdown-section";
import { MonthlyGroupSection } from "./monthly-group-section";
import { MonthlySpendSection } from "./monthly-spend-section";
import { MissingSerialSection } from "./missing-serial-section";
import { RepairDemandSection } from "./repair-demand-section";
import { StatusOverviewSection } from "./status-overview-section";
import { WorkflowFlowSection } from "./workflow-flow-section";
import {
  selectAllCompanies,
  selectBreakdown,
  selectMonthlySpend,
  selectRepairDemand,
} from "../lib/selectors";
import { formatCurrency, formatYM } from "../lib/transform";
import type { RepairDataset } from "../lib/types";
import { selectWorkflowFlows } from "../lib/workflow-flow";
import {
  filteredDatasetAtom,
  filteredRowsAtom,
  mappingAtom,
  missingSerialRowsAtom,
  validRawRowsAtom,
} from "../state/atoms";

/** Aggregate operational dashboard across every company. */
export function AllCompaniesView({ dataset }: { dataset: RepairDataset }) {
  const rows = useAtomValue(validRawRowsAtom);
  const mapping = useAtomValue(mappingAtom);
  const filteredRows = useAtomValue(filteredRowsAtom);
  const missingSerialRows = useAtomValue(missingSerialRowsAtom);
  const filteredDataset = useAtomValue(filteredDatasetAtom) ?? dataset;
  const view = useMemo(
    () => selectAllCompanies(filteredDataset),
    [filteredDataset],
  );
  const breakdown = useMemo(
    () => selectBreakdown(filteredDataset),
    [filteredDataset],
  );
  const repairDemand = useMemo(
    () => selectRepairDemand(filteredDataset),
    [filteredDataset],
  );
  const monthlySpend = useMemo(
    () => selectMonthlySpend(filteredDataset),
    [filteredDataset],
  );
  const workflowFlows = useMemo(
    () => selectWorkflowFlows(filteredRows, rows, mapping),
    [filteredRows, rows, mapping],
  );
  const monthLabels = filteredDataset.allMonths.map(formatYM);
  const passCount = view.statuses.find((item) => item.status === "PASS")?.count ?? 0;
  const notPassCount =
    view.statuses.find((item) => item.status === "NOT PASS")?.count ?? 0;
  const completed = passCount + notPassCount;
  const passRate = completed > 0 ? (passCount / completed) * 100 : null;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Operations overview"
        title="Repair overview"
        description="Monitor repair volume, completion quality, equipment mix, and cost across every service company."
        dateControl={
          <DateRangeControl
            availableMonths={dataset.allMonths}
            disabled={!mapping.ym}
          />
        }
        meta={`${view.companyCount} companies`}
      />

      <div className="mb-7 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total repair records"
          value={view.grandTotal.toLocaleString()}
          sub={`${view.groups.length.toLocaleString()} equipment groups`}
          accent="blue"
          icon={FileStack}
          featured
        />
        <MetricCard
          label="Total repair amount"
          value={formatCurrency(view.grandAmount)}
          sub="Across priced repair rows"
          accent="violet"
          icon={Banknote}
        />
        <MetricCard
          label="Completed pass rate"
          value={passRate == null ? "—" : `${passRate.toFixed(1)}%`}
          sub={`${completed.toLocaleString()} completed records`}
          accent="green"
          icon={CircleCheck}
        />
        <MetricCard
          label="Service companies"
          value={view.companyCount.toLocaleString()}
          sub={`${monthLabels.length.toLocaleString()} reporting periods`}
          accent="blue"
          icon={Building2}
        />
      </div>

      <RepairDemandSection monthLabels={monthLabels} view={repairDemand} />
      <MonthlySpendSection monthLabels={monthLabels} view={monthlySpend} />
      <StatusOverviewSection
        title="Current status mix"
        statuses={view.statuses}
        rows={filteredRows}
        mapping={mapping}
      />
      <MissingSerialSection rows={missingSerialRows} mapping={mapping} />
      <WorkflowFlowSection flows={workflowFlows} />
      <CompanyComparisonSection companyStats={view.companyStats} />
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
