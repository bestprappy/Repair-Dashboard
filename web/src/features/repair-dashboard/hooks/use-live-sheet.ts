"use client";

import { useEffect, useRef } from "react";

import { useQuery } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";

import { fetchSheetCsv } from "@/lib/google-sheet/fetch-sheet";

import { LIVE_REFRESH_MS, LIVE_SHEET_REF } from "../lib/live-sheet";
import { buildDataset } from "../lib/transform";
import type { CsvRow } from "../lib/types";
import {
  csvFieldsAtom,
  dataSourceAtom,
  datasetAtom,
  guessMapping,
  lastUpdatedAtom,
  mappingAtom,
  rawRowsAtom,
  stageAtom,
  viewAtom,
} from "../state/atoms";

/**
 * Fetches the configured Google Sheet, rebuilds the dataset on every refresh
 * (60s while the tab is open), and feeds the same atoms the upload flow uses.
 * Inactive when no sheet is configured or the user switched to CSV upload.
 */
export function useLiveSheet() {
  const source = useAtomValue(dataSourceAtom);
  const setRows = useSetAtom(rawRowsAtom);
  const setFields = useSetAtom(csvFieldsAtom);
  const setMapping = useSetAtom(mappingAtom);
  const setDataset = useSetAtom(datasetAtom);
  const setStage = useSetAtom(stageAtom);
  const setView = useSetAtom(viewAtom);
  const setLastUpdated = useSetAtom(lastUpdatedAtom);

  /** Whether a live payload has been applied; first one also opens the dash. */
  const hasAppliedRef = useRef(false);

  const query = useQuery({
    queryKey: [
      "live-sheet",
      LIVE_SHEET_REF?.sheetId ?? "",
      LIVE_SHEET_REF?.gid ?? "",
    ],
    queryFn: () => {
      if (!LIVE_SHEET_REF) throw new Error("No live sheet configured.");
      return fetchSheetCsv(LIVE_SHEET_REF);
    },
    enabled: LIVE_SHEET_REF !== null && source === "live",
    refetchInterval: LIVE_REFRESH_MS,
    retry: 1,
  });

  const { data } = query;

  useEffect(() => {
    if (!data || source !== "live") return;
    try {
      const { header, rows } = data;
      const csvRows: CsvRow[] = rows.map((row) => {
        const record: CsvRow = {};
        header.forEach((field, index) => {
          record[field] = row[index] ?? "";
        });
        return record;
      });
      const mapping = guessMapping(header);
      const dataset = buildDataset(csvRows, mapping);

      setRows(csvRows);
      setFields(header);
      setMapping(mapping);
      setDataset(dataset);
      setLastUpdated(Date.now());

      // Only the first payload navigates; background refreshes must not
      // yank the user away from the company view they are reading.
      if (!hasAppliedRef.current) {
        hasAppliedRef.current = true;
        setView("all");
        setStage("dash");
      }
    } catch (error) {
      console.error("[useLiveSheet] failed to build dataset from live sheet", {
        sheetId: LIVE_SHEET_REF?.sheetId,
        error,
      });
    }
  }, [
    data,
    source,
    setRows,
    setFields,
    setMapping,
    setDataset,
    setLastUpdated,
    setView,
    setStage,
  ]);

  return query;
}
