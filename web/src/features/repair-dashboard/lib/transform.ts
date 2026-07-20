import type { ColumnMapping, CsvRow, RepairDataset } from "./types";

/** Categorical palette shared by every chart. Slots 6–10 blend adjacent
 * chart tokens so overflow series stay inside the active theme's ramp. */
export const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "color-mix(in oklch, var(--chart-1) 55%, var(--chart-3))",
  "color-mix(in oklch, var(--chart-2) 55%, var(--chart-4))",
  "color-mix(in oklch, var(--chart-3) 55%, var(--chart-5))",
  "color-mix(in oklch, var(--chart-4) 55%, var(--chart-1))",
  "color-mix(in oklch, var(--chart-5) 55%, var(--chart-2))",
] as const;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Pick a stable color for an index. */
export function paletteColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/** Semantic tone of a status label. */
export type StatusTone = "good" | "warning" | "bad" | "claim" | "noFault";

/** Reserved status colors — never reused per-series. Tokens live in
 * globals.css; violet comes from the shared palette. */
const STATUS_TONE_COLORS: Record<StatusTone, string> = {
  good: "var(--success)", // green
  warning: "var(--warning)", // amber
  bad: "var(--error)", // red
  claim: "var(--info)", // blue
  noFault: PALETTE[5], // violet
};

/**
 * Palette slots that don't read as a status hue above, so an unmapped
 * status can never impersonate PASS, FAIL, CLAIM, or NO FAULT FOUND.
 */
const NEUTRAL_FALLBACK = [
  PALETTE[4], // teal
  PALETTE[6], // pink
] as const;

/** Classify a status label into a semantic tone, or null when unknown. */
export function statusTone(status: string): StatusTone | null {
  const label = status.toUpperCase();
  if (/NO[\s_-]*FAULT|\bNFF\b/.test(label)) return "noFault";
  if (/CLAIM/.test(label)) return "claim";
  // Negated matches ("NOT PASS", "CANNOT REPAIR") must win over the plain
  // "PASS" / "REPAIR" matches below.
  if (/(NOT|NO|UN)[\s_-]*PASS|FAIL|REJECT|ERROR|CANNOT|UNREPAIR|\bNG\b/.test(label)) {
    return "bad";
  }
  if (/PASS|SUCCESS|COMPLETE|DONE|GOOD|\bOK\b/.test(label)) return "good";
  if (/WAIT|PENDING|HOLD|PROGRESS|PROCESS|REPAIR|REVIEW|CHECK|RETURN/.test(label)) {
    return "warning";
  }
  return null;
}

/**
 * Semantic color for a status (PASS → green, NOT PASS → red, CLAIM → blue,
 * NO FAULT FOUND → violet, WAIT / RETURN → amber); unknown statuses fall
 * back to a stable neutral color.
 */
export function statusColor(status: string, fallbackIndex: number): string {
  const tone = statusTone(status);
  return tone
    ? STATUS_TONE_COLORS[tone]
    : NEUTRAL_FALLBACK[fallbackIndex % NEUTRAL_FALLBACK.length];
}

/** Parse a "Y&M" value like "2025M01" into a sortable "2025-01" key, or null. */
export function parseYM(value: unknown): string | null {
  const match = String(value ?? "")
    .trim()
    .match(/^(\d{4})\s*M\s*(\d{1,2})$/i);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${match[1]}-${String(month).padStart(2, "0")}`;
}

/** Format a "2025-01" key into "Jan '25" for chart axes. */
export function formatYM(key: string): string {
  const [year, month] = key.split("-");
  return `${MONTHS[Number(month) - 1]} '${year.slice(2)}`;
}

/** Coerce a currency-ish string ("฿1,200") into a number, defaulting to 0. */
export function toNumber(value: unknown): number {
  if (value == null) return 0;
  const parsed = parseFloat(String(value).replace(/฿|,|\s/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Compact number formatting for axis ticks and bar labels (1.2M / 3K). */
export function formatCompact(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}K`;
  return value.toLocaleString();
}

/** Consistent Thai-baht display for KPI and tooltip values. */
export function formatCurrency(value: number, maximumFractionDigits = 0): string {
  return `฿${new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value)}`;
}

/** Read an optionally-mapped column off a row, trimmed ("" when unmapped). */
export function readColumn(row: CsvRow, column: string | undefined): string {
  return column ? (row[column] ?? "").trim() : "";
}

/**
 * Data Tab Sheet stages excluded from the dashboard entirely (SVM in/out
 * movements are stock transfers, not repairs).
 */
const EXCLUDED_TAB_SHEETS = /SVM/i;

/** Whether a Data Tab Sheet value marks a row the dashboard must ignore. */
export function isExcludedTabSheet(value: string): boolean {
  return EXCLUDED_TAB_SHEETS.test(value);
}

/**
 * Split a combined cause cell ("Surge , Deteriorated") into normalized
 * tokens. Case-folds English so "Surge" and "SURGE" merge; Thai is unchanged.
 */
export function splitCauseTokens(value: string): string[] {
  return value
    .split(/[,/]+/)
    .map((token) => token.trim().replace(/\s+/g, " ").toUpperCase())
    .filter(Boolean);
}

/** Build the aggregated dataset from raw CSV rows and a column mapping. */
export function buildDataset(rows: CsvRow[], mapping: ColumnMapping): RepairDataset {
  const companies: RepairDataset["companies"] = {};
  const statusSet = new Set<string>();
  const monthSet = new Set<string>();

  for (const row of rows) {
    const company = (row[mapping.company] ?? "").trim();
    const status = (row[mapping.status] ?? "").trim().toUpperCase();
    const group = (row[mapping.group] ?? "Unknown").trim() || "Unknown";
    const amount = toNumber(row[mapping.amount]);
    const ym = parseYM(row[mapping.ym]);
    if (!company || !status) continue;

    const tabSheet = readColumn(row, mapping.tabSheet);
    if (isExcludedTabSheet(tabSheet)) continue;

    statusSet.add(status);

    const data =
      companies[company] ??
      (companies[company] = {
        statusCount: {},
        statusGroups: {},
        monthly: {},
        statusMonthly: {},
        modelCount: {},
        causeCount: {},
        subCauseCount: {},
        amount: 0,
      });

    data.statusCount[status] = (data.statusCount[status] ?? 0) + 1;
    data.amount += amount;

    const groups = (data.statusGroups[status] ??= {});
    const groupStat = (groups[group] ??= { count: 0, amount: 0 });
    groupStat.count += 1;
    groupStat.amount += amount;

    if (ym) {
      const byMonth = (data.statusMonthly[status] ??= {});
      byMonth[ym] = (byMonth[ym] ?? 0) + 1;
      monthSet.add(ym);
    }

    if (ym && amount > 0) {
      const monthly = (data.monthly[group] ??= {});
      monthly[ym] = (monthly[ym] ?? 0) + amount;
    }

    const model = readColumn(row, mapping.model);
    if (model) data.modelCount[model] = (data.modelCount[model] ?? 0) + 1;

    for (const token of splitCauseTokens(readColumn(row, mapping.cause))) {
      data.causeCount[token] = (data.causeCount[token] ?? 0) + 1;
    }

    for (const token of splitCauseTokens(readColumn(row, mapping.subCause))) {
      data.subCauseCount[token] = (data.subCauseCount[token] ?? 0) + 1;
    }
  }

  let grandTotal = 0;
  for (const data of Object.values(companies)) {
    for (const count of Object.values(data.statusCount)) grandTotal += count;
  }

  return {
    companies,
    allStatuses: [...statusSet],
    allMonths: [...monthSet].sort(),
    grandTotal,
  };
}
