"use client";

import { useMemo } from "react";

import { useAtomValue } from "jotai";

import { DashboardPageHeader } from "@/components/dashboard-page-header";

import { DateRangeControl } from "./date-range-control";
import { GroupModelRelationSection } from "./group-model-relation-section";
import { filterAnalyzedRows } from "../lib/insights";
import type { RepairDataset } from "../lib/types";
import { filteredRowsAtom, mappingAtom } from "../state/atoms";

/** Group-to-model evidence and the resulting repair-company recommendation. */
export function RepairRecommendationView({
  dataset,
}: {
  dataset: RepairDataset;
}) {
  const filteredRows = useAtomValue(filteredRowsAtom);
  const mapping = useAtomValue(mappingAtom);
  const analyzedRows = useMemo(
    () => filterAnalyzedRows(filteredRows, mapping),
    [filteredRows, mapping],
  );

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Equipment routing"
        title="Repair recommendation"
        description="Follow the equipment group and model relationship into company evidence, then choose the best-supported repair route from historical completed outcomes."
        months={dataset.allMonths}
        dateControl={
          <DateRangeControl
            availableMonths={dataset.allMonths}
            disabled={!mapping.ym}
          />
        }
        meta={`${analyzedRows.length.toLocaleString()} analyzed records`}
      />

      <GroupModelRelationSection rows={analyzedRows} mapping={mapping} />
    </div>
  );
}
