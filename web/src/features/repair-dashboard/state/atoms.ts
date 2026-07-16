import { atom } from "jotai";

import { LIVE_SHEET_REF } from "../lib/live-sheet";
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
    date: pick("date") || "",
  };
}

/** The working column mapping shown in the mapping screen. */
export const mappingAtom = atom<ColumnMapping>(guessMapping([]));
