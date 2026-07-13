import type { ColumnMapping, CsvRow, RepairDataset } from "./types";

/** Categorical palette shared by every chart. */
export const PALETTE = [
  "#4f8ef7",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#2dd4bf",
  "#a78bfa",
  "#f472b6",
  "#60a5fa",
  "#86efac",
  "#fdba74",
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
export type StatusTone = "good" | "warning" | "bad";

/** Global CSS tokens (see globals.css) — reserved, never per-series. PASS
 * wears the primary brand blue; failures and in-progress states wear the
 * semantic error/warning tokens. */
const STATUS_TONE_COLORS: Record<StatusTone, string> = {
  good: "var(--primary)",
  warning: "var(--warning)",
  bad: "var(--error)",
};

/**
 * Palette slots that don't read as a status hue (no blue/red/amber), so an
 * unmapped status can never impersonate PASS or FAIL next to a mapped one.
 */
const NEUTRAL_FALLBACK = [
  PALETTE[4], // teal
  PALETTE[5], // violet
  PALETTE[6], // pink
] as const;

/** Classify a status label into a semantic tone, or null when unknown. */
export function statusTone(status: string): StatusTone | null {
  const label = status.toUpperCase();
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
 * Semantic color for a status (PASS → primary, NOT PASS → error, WAIT /
 * RETURN → warning); unknown statuses fall back to a stable neutral color.
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

    statusSet.add(status);

    const data =
      companies[company] ??
      (companies[company] = {
        statusCount: {},
        statusGroups: {},
        monthly: {},
        amount: 0,
      });

    data.statusCount[status] = (data.statusCount[status] ?? 0) + 1;
    data.amount += amount;

    const groups = (data.statusGroups[status] ??= {});
    const groupStat = (groups[group] ??= { count: 0, amount: 0 });
    groupStat.count += 1;
    groupStat.amount += amount;

    if (ym && amount > 0) {
      const monthly = (data.monthly[group] ??= {});
      monthly[ym] = (monthly[ym] ?? 0) + amount;
      monthSet.add(ym);
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
