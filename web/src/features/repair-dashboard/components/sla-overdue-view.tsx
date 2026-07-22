"use client";

import { useMemo } from "react";

import { useAtomValue } from "jotai";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DateRangeControl } from "./date-range-control";
import { SlaSection } from "./sla-section";
import { filterAnalyzedRows } from "../lib/insights";
import type { RepairDataset } from "../lib/types";
import { mappingAtom, rawRowsAtom } from "../state/atoms";

/** Dedicated page for SLA turnaround, aging, and overdue open repairs. */
export function SlaOverdueView({ dataset }: { dataset: RepairDataset }) {
  const rows = useAtomValue(rawRowsAtom);
  const mapping = useAtomValue(mappingAtom);

  const allAnalyzedRows = useMemo(
    () => filterAnalyzedRows(rows, mapping),
    [rows, mapping],
  );
  return (
    <div>
      <DashboardPageHeader
        eyebrow="Turnaround & aging"
        title="SLA and Overdue"
        description="Track input-to-output turnaround, SLA compliance, and the open repairs aging past target—separating current-year cohorts from confirmed carryover."
        dateControl={<DateRangeControl availableMonths={dataset.allMonths} disabled={!mapping.date} />}
      />
      <SlaSection rows={allAnalyzedRows} mapping={mapping} />
    </div>
  );
}
