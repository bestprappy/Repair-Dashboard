"use client";

import { useMemo } from "react";

import { useAtomValue } from "jotai";

import { DashboardPageHeader } from "@/components/dashboard-page-header";

import { DataExplorerSection } from "./data-explorer-section";
import { GroupModelRelationSection } from "./group-model-relation-section";
import { ModelDeepDiveSection } from "./model-deep-dive-section";
import { RepeatRepairsSection } from "./repeat-repairs-section";
import { SlaSection } from "./sla-section";
import { filterAnalyzedRows } from "../lib/insights";
import type { RepairDataset } from "../lib/types";
import { csvFieldsAtom, mappingAtom, rawRowsAtom } from "../state/atoms";

/** Equipment/model relationships, repeat repairs, and raw-row drill-downs. */
export function InsightsView({ dataset }: { dataset: RepairDataset }) {
  const rows = useAtomValue(rawRowsAtom);
  const fields = useAtomValue(csvFieldsAtom);
  const mapping = useAtomValue(mappingAtom);

  const analyzedRows = useMemo(
    () => filterAnalyzedRows(rows, mapping),
    [rows, mapping],
  );

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Equipment relationships"
        title="Equipment & models"
        description="Explore which models appear most often within each equipment group, then move into model, repeat-repair, and record-level evidence."
        months={dataset.allMonths}
        meta={`${analyzedRows.length.toLocaleString()} analyzed records`}
      />
      <SlaSection rows={analyzedRows} mapping={mapping} />
      <GroupModelRelationSection rows={analyzedRows} mapping={mapping} />
      <ModelDeepDiveSection rows={analyzedRows} mapping={mapping} />
      <RepeatRepairsSection rows={analyzedRows} mapping={mapping} />
      <DataExplorerSection
        rows={analyzedRows}
        fields={fields}
        mapping={mapping}
      />
    </div>
  );
}
