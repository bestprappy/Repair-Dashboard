import type {
  ColumnMapping,
  CsvRow,
  RepairDataset,
} from "./types";

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
  if (/WAIT|PENDING|HOLD|PROGRESS|PROCESS|REPAIR|REVIEW|CHECK|RETURN|CARRYOVER/.test(label)) {
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

/** Format lifecycle dates consistently as DD/MM/YY without changing source data. */
export function formatDisplayDate(value: string | Date): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${String(value.getFullYear()).slice(-2)}`;
  }
  const trimmed = value.trim();
  if (!trimmed) return "";
  const before = trimmed.match(/^Before\s+(.+)$/i);
  if (before) return `Before ${formatDisplayDate(before[1])}`;
  const dayFirst = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dayFirst) return `${dayFirst[1].padStart(2, "0")}/${dayFirst[2].padStart(2, "0")}/${dayFirst[3].slice(-2)}`;
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[3].padStart(2, "0")}/${iso[2].padStart(2, "0")}/${iso[1].slice(-2)}`;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : formatDisplayDate(parsed);
}

function workflowDateTime(value: string): number {
  // Source dates are DD/MM/YYYY, so parse that explicitly first. new Date()
  // would misread e.g. "06/01/2026" as US MM/DD (June 1) instead of 6 Jan,
  // corrupting the pairing order and turnaround. ISO/other formats still fall
  // through to new Date().
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return new Date(year, Number(match[2]) - 1, Number(match[1])).getTime();
  }
  return new Date(value).getTime();
}

/** SVM in/out stages are stock movements, not repair lifecycle records. */
const EXCLUDED_TAB_SHEETS = /SVM/i;

/** Whether a Data Tab Sheet value is an SVM stock-movement stage. */
export function isExcludedTabSheet(value: string): boolean {
  return EXCLUDED_TAB_SHEETS.test(value);
}

/** Whether a serial cell is blank, a placeholder, or descriptive text. */
export function invalidSerialReason(value: string): string | null {
  const serial = value.trim();
  if (!serial) return "Blank";
  if (/^(?:-|—|N\/?A|NA|NONE|NULL|UNKNOWN|NOT[ _-]?AVAILABLE)$/i.test(serial)) {
    return "Placeholder value";
  }
  // Serial identifiers in this dataset are Latin letters/digits. Thai text
  // such as "ผิดรุ่น" is an operator note, not a trackable unit identifier.
  if (/[\u0E00-\u0E7F]/.test(serial)) return "Descriptive text";
  if (!/[A-Z0-9]/i.test(serial)) return "Invalid format";
  return null;
}

function isRepairInputStage(value: string): boolean {
  return !isExcludedTabSheet(value) && /input/i.test(value);
}

function isRepairOutputStage(value: string): boolean {
  return !isExcludedTabSheet(value) && /output/i.test(value);
}

/**
 * Overview lifecycle rule: REPAIR represents an intake; every outcome status
 * represents an output. This prevents the aggregate and company dashboards
 * from mixing duplicate/inapplicable statuses across the two workflow sheets.
 */
function isOverviewLifecycleRow(status: string, stage: string): boolean {
  return status === "REPAIR"
    ? isRepairInputStage(stage)
    : isRepairOutputStage(stage);
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

/**
 * Build the aggregated dataset from raw CSV rows and a column mapping.
 * `workflowRows` may include records outside `rows` so date-filtered views
 * preserve the input/output pairs established from the complete history. When
 * repair workflow stages are available, overview aggregates use REPAIR intake
 * rows and output rows for every other status.
 */
export function buildDataset(
  rows: CsvRow[],
  mapping: ColumnMapping,
  workflowRows: CsvRow[] = rows,
): RepairDataset {
  const companies: RepairDataset["companies"] = {};
  const statusSet = new Set<string>();
  const monthSet = new Set<string>();

  // Attach paired workflow dates to both rows in a repair cycle so the group
  // drill-down can show input and output dates together.
  const workflowDates = new WeakMap<CsvRow, { inputDate: string; outputDate: string }>();
  const workflowUnits = new Map<string, { row: CsvRow; date: string; time: number; stage: string }[]>();
  if (mapping.date && mapping.tabSheet) {
    for (const row of workflowRows) {
      const date = readColumn(row, mapping.date);
      const stage = readColumn(row, mapping.tabSheet);
      if (isExcludedTabSheet(stage)) continue;
      if (!date || !/(input|output)/i.test(stage)) continue;
      const own = { inputDate: /input/i.test(stage) ? date : "", outputDate: /output/i.test(stage) ? date : "" };
      workflowDates.set(row, own);
      const serial = readColumn(row, mapping.serial);
      if (!serial) continue;
      const material = readColumn(row, mapping.material);
      // Pair within a single repair ticket (TR No.). A serial identifies a
      // physical unit serviced across many tickets over time, so serial alone
      // cross-links unrelated cycles, closing an open intake with an unrelated
      // later output for the same device. Ticket is optional: an empty value
      // preserves the legacy serial-only grouping for datasets without one.
      const ticket = readColumn(row, mapping.ticket);
      const key = `${readColumn(row, mapping.company)}\u0000${material}\u0000${serial}\u0000${ticket}`;
      const time = workflowDateTime(date);
      if (Number.isNaN(time)) continue;
      workflowUnits.set(key, [...(workflowUnits.get(key) ?? []), { row, date, time, stage }]);
    }
    for (const events of workflowUnits.values()) {
      events.sort((a, b) => a.time - b.time);
      const pending: typeof events = [];
      for (const event of events) {
        if (/input/i.test(event.stage)) pending.push(event);
        else {
          const input = pending.shift();
          if (!input || event.time < input.time) continue;
          const pair = { inputDate: input.date, outputDate: event.date };
          workflowDates.set(input.row, pair);
          workflowDates.set(event.row, pair);
        }
      }
    }
  }

  // Preserve support for legacy uploads without a workflow-stage column. Once
  // the source exposes repair input/output stages, enforce the lifecycle rule
  // consistently even when a date-filtered subset contains only one side.
  const usesRepairStages =
    Boolean(mapping.tabSheet) &&
    workflowRows.some((row) => {
      const stage = readColumn(row, mapping.tabSheet);
      return isRepairInputStage(stage) || isRepairOutputStage(stage);
    });

  for (const row of rows) {
    // Rows without the mapped unit identifier remain available to the
    // data-quality view but must not influence dashboard calculations.
    if (mapping.serial && invalidSerialReason(readColumn(row, mapping.serial))) continue;
    const company = (row[mapping.company] ?? "").trim();
    const status = (row[mapping.status] ?? "").trim().toUpperCase();
    const group = (row[mapping.group] ?? "Unknown").trim() || "Unknown";
    const amount = toNumber(row[mapping.amount]);
    const ym = parseYM(row[mapping.ym]);
    if (!company || !status) continue;
    const stage = readColumn(row, mapping.tabSheet);
    if (isExcludedTabSheet(stage)) continue;
    if (usesRepairStages && !isOverviewLifecycleRow(status, stage)) {
      continue;
    }

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
    const groupStat = (groups[group] ??= { count: 0, amount: 0, details: {} });
    groupStat.count += 1;
    groupStat.amount += amount;

    const model = readColumn(row, mapping.model) || "Unknown";
    const equipment = readColumn(row, mapping.equipment) || "Unknown";
    const dates = workflowDates.get(row) ?? { inputDate: "", outputDate: "" };
    const detailKey = `${model}\u0000${equipment}\u0000${dates.inputDate}\u0000${dates.outputDate}`;
    const detail = (groupStat.details[detailKey] ??= {
      model,
      equipment,
      ...dates,
      count: 0,
      amount: 0,
    });
    detail.count += 1;
    detail.amount += amount;

    if (ym) {
      const byMonth = (data.statusMonthly[status] ??= {});
      byMonth[ym] = (byMonth[ym] ?? 0) + 1;
      monthSet.add(ym);
    }

    if (ym && amount > 0) {
      const monthly = (data.monthly[group] ??= {});
      monthly[ym] = (monthly[ym] ?? 0) + amount;
    }

    if (model !== "Unknown") {
      data.modelCount[model] = (data.modelCount[model] ?? 0) + 1;
    }

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
