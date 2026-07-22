"use client";

import { useMemo, useRef, useState } from "react";

import { useAtomValue } from "jotai";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { DataExplorerSection } from "./data-explorer-section";
import { ModelDeepDiveSection } from "./model-deep-dive-section";
import { RepeatRepairsSection } from "./repeat-repairs-section";
import { filterAnalyzedRows, getRowYear } from "../lib/insights";
import type { RepairDataset } from "../lib/types";
import { csvFieldsAtom, mappingAtom, validRawRowsAtom } from "../state/atoms";

/** Model analysis, repeat repairs, and raw-row drill-downs. */
export function InsightsView({ dataset }: { dataset: RepairDataset }) {
  const rows = useAtomValue(validRawRowsAtom);
  const fields = useAtomValue(csvFieldsAtom);
  const mapping = useAtomValue(mappingAtom);
  const [explorerUnit, setExplorerUnit] = useState<{ serial: string; material: string } | null>(null);
  const explorerRef = useRef<HTMLDivElement>(null);

  const allAnalyzedRows = useMemo(
    () => filterAnalyzedRows(rows, mapping),
    [rows, mapping],
  );
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const month of dataset.allMonths) years.add(Number(month.slice(0, 4)));
    for (const row of allAnalyzedRows) {
      const year = getRowYear(row, mapping);
      if (year) years.add(year);
    }
    return [...years].sort((a, b) => b - a);
  }, [allAnalyzedRows, mapping, currentYear, dataset.allMonths]);
  const analyzedRows = useMemo(
    () => allAnalyzedRows.filter((row) => getRowYear(row, mapping) === selectedYear),
    [allAnalyzedRows, mapping, selectedYear],
  );

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Equipment analysis"
        title="Equipment & models"
        description="Investigate individual models, repeat repairs, and record-level evidence. Equipment-to-model routing now lives on Repair recommendation."
        dateControl={
          <Select value={String(selectedYear)} onValueChange={(value) => { if (value) setSelectedYear(Number(value)); setExplorerUnit(null); }}>
            <SelectTrigger className="w-28" aria-label="Reporting year"><SelectValue /></SelectTrigger>
            <SelectContent>{availableYears.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent>
          </Select>
        }
        meta={`${analyzedRows.length.toLocaleString()} analyzed records`}
      />
      <ModelDeepDiveSection rows={analyzedRows} mapping={mapping} />
      <RepeatRepairsSection
        rows={analyzedRows}
        historyRows={allAnalyzedRows}
        mapping={mapping}
        onSelectUnit={(unit) => {
          setExplorerUnit({ serial: unit.serial, material: unit.material });
          requestAnimationFrame(() => explorerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
        }}
      />
      <div ref={explorerRef} className="scroll-mt-4">
        <DataExplorerSection
          rows={analyzedRows}
          historyRows={allAnalyzedRows}
          fields={fields}
          mapping={mapping}
          focusedUnit={explorerUnit}
          onClearFocusedUnit={() => setExplorerUnit(null)}
        />
      </div>
    </div>
  );
}
