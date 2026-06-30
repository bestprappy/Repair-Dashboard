import { atom } from "jotai";

import type {
  ColumnMapping,
  CsvRow,
  DashboardStage,
  DashboardView,
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
};

/** Guess an initial mapping from the available CSV headers. */
export function guessMapping(fields: string[]): ColumnMapping {
  const pick = (key: keyof ColumnMapping): string => {
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
  };
}

/** The working column mapping shown in the mapping screen. */
export const mappingAtom = atom<ColumnMapping>(guessMapping([]));
