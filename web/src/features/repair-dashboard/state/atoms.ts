import { atom } from "jotai";

import { LIVE_SHEET_REF } from "../lib/live-sheet";
import {
  buildDataset,
  invalidSerialReason,
  isExcludedTabSheet,
  parseYM,
  readColumn,
} from "../lib/transform";
import type {
  ColumnMapping,
  CsvRow,
  DashboardStage,
  DashboardView,
  DataSource,
  RepairDataset,
} from "../lib/types";

/** Raw parsed CSV rows from PapaParse. */
export const rawRowsAtom = atom<CsvRow[]>([]);

/** Column headers detected in the uploaded CSV. */
export const csvFieldsAtom = atom<string[]>([]);

/** The built dataset, or null before "Build Dashboard". */
export const datasetAtom = atom<RepairDataset | null>(null);

/** Current screen in the flow. */
export const stageAtom = atom<DashboardStage>("upload");

/** Active view: "all" or a company name. */
export const viewAtom = atom<DashboardView>("all");

/** Whether data comes from the live Google Sheet or a manual CSV upload. */
export const dataSourceAtom = atom<DataSource>(
  LIVE_SHEET_REF ? "live" : "upload",
);

/** Epoch ms of the last successful live refresh, or null before one lands. */
export const lastUpdatedAtom = atom<number | null>(null);

/** Header summary string ("12,345 records · 8 companies"). */
export const summaryAtom = atom((get) => {
  const dataset = get(datasetAtom);
  if (!dataset) return "No data loaded";
  const companies = Object.keys(dataset.companies).length;
  return `${dataset.grandTotal.toLocaleString()} records · ${companies} companies`;
});

/** Default column guesses keyed by field, matched against header keywords. */
const FIELD_KEYWORDS: Record<keyof ColumnMapping, string[]> = {
  company: ["company"],
  status: ["status"],
  group: ["group"],
  ym: ["y&m", "year", "month"],
  amount: ["amount"],
  equipment: ["equipment"],
  model: ["model"],
  tabSheet: ["tab sheet", "tab"],
  cause: ["cause"],
  subCause: ["sub cause", "subcause", "sub_cause"],
  serial: ["serial"],
  material: ["material"],
  ticket: ["tr no", "ticket", "tr number"],
  date: ["date", "transaction date", "repair date"],
};

/** Guess an initial mapping from the available CSV headers. */
export function guessMapping(fields: string[]): ColumnMapping {
  const pick = (key: keyof ColumnMapping): string => {
    // Exact header match wins so "Equipment" beats "Group Equipment" and
    // "Cause" beats "Sub Cause"; fall back to the first substring match.
    for (const keyword of FIELD_KEYWORDS[key]) {
      const exact = fields.find((field) => field.toLowerCase() === keyword);
      if (exact) return exact;
    }
    const match = fields.find((field) =>
      FIELD_KEYWORDS[key].some((kw) => field.toLowerCase().includes(kw)),
    );
    return match ?? "";
  };
  return {
    company: pick("company") || fields[0] || "",
    status: pick("status") || fields[0] || "",
    group: pick("group") || fields[0] || "",
    ym: pick("ym") || fields[0] || "",
    amount: pick("amount") || fields[0] || "",
    equipment: pick("equipment") || "",
    model: pick("model") || "",
    tabSheet: pick("tabSheet") || "",
    cause: pick("cause") || "",
    subCause: pick("subCause") || "",
    serial: pick("serial") || "",
    material: pick("material") || "",
    ticket: pick("ticket") || "",
    date: pick("date") || "",
  };
}

/** The working column mapping shown in the mapping screen. */
export const mappingAtom = atom<ColumnMapping>(guessMapping([]));

const CURRENT_YEAR = new Date().getFullYear();

/** Default reporting window: the full current calendar year (`YYYY-MM`). */
export const DEFAULT_START_MONTH = `${CURRENT_YEAR}-01`;
export const DEFAULT_END_MONTH = `${CURRENT_YEAR}-12`;

/**
 * Global reporting window shared by every dashboard page. Changing either bound
 * re-filters the data for all views at once (single source of truth).
 */
export const startMonthAtom = atom(DEFAULT_START_MONTH);
export const endMonthAtom = atom(DEFAULT_END_MONTH);

/** All source rows narrowed to the selected reporting window. */
const reportingRowsAtom = atom((get) => {
  const rows = get(rawRowsAtom);
  const mapping = get(mappingAtom);
  // Without a mapped Y&M column there is no date to filter on.
  if (!mapping.ym) return rows;
  const start = get(startMonthAtom);
  const end = get(endMonthAtom);
  return rows.filter((row) => {
    const month = parseYM(readColumn(row, mapping.ym));
    return month != null && month >= start && month <= end;
  });
});

/** Data-quality exceptions retained for audit but excluded from analytics. */
export const missingSerialRowsAtom = atom((get) => {
  const mapping = get(mappingAtom);
  if (!mapping.serial) return [];
  return get(reportingRowsAtom).filter((row) => {
    const stage = readColumn(row, mapping.tabSheet);
    if (mapping.tabSheet && (isExcludedTabSheet(stage) || !/(input|output)/i.test(stage))) {
      return false;
    }
    return Boolean(invalidSerialReason(readColumn(row, mapping.serial)));
  });
});

/** Complete valid history used by analyses that pair events across periods. */
export const validRawRowsAtom = atom((get) => {
  const mapping = get(mappingAtom);
  const rows = get(rawRowsAtom);
  if (!mapping.serial) return rows;
  return rows.filter(
    (row) => !invalidSerialReason(readColumn(row, mapping.serial)),
  );
});

/** Reporting rows eligible for every dashboard calculation. */
export const filteredRowsAtom = atom((get) => {
  const mapping = get(mappingAtom);
  const rows = get(reportingRowsAtom);
  if (!mapping.serial) return rows;
  return rows.filter(
    (row) => !invalidSerialReason(readColumn(row, mapping.serial)),
  );
});

/**
 * The built dataset aggregated over the selected reporting window. Workflow
 * events are paired against the complete history (third argument) before the
 * window is applied, so date boundaries never rematch an output to the wrong
 * input. Falls back to the full dataset when no date column is mapped.
 */
export const filteredDatasetAtom = atom((get) => {
  const base = get(datasetAtom);
  if (!base) return null;
  const mapping = get(mappingAtom);
  if (!mapping.ym) return base;
  const rows = get(rawRowsAtom);
  const filtered = get(filteredRowsAtom);
  return buildDataset(filtered, mapping, rows);
});
