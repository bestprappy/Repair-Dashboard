/** Row-level analytics for the In-Depth Analysis view. */

import {
  formatYM,
  isExcludedTabSheet,
  parseYM,
  readColumn,
  splitCauseTokens,
  toNumber,
} from "./transform";
import type { RankDatum, StatusDatum } from "./selectors";
import type { ColumnMapping, CsvRow } from "./types";

/** Rows the dashboard analyzes: SVM stock movements removed. */
export function filterAnalyzedRows(
  rows: CsvRow[],
  mapping: ColumnMapping,
): CsvRow[] {
  return rows.filter(
    (row) => !isExcludedTabSheet(readColumn(row, mapping.tabSheet)),
  );
}

/** Models matching a search query, ranked by repair volume. */
export function rankModels(
  rows: CsvRow[],
  mapping: ColumnMapping,
  query: string,
  limit: number,
): RankDatum[] {
  if (!mapping.model) return [];
  const counts = new Map<string, number>();
  for (const row of rows) {
    const model = readColumn(row, mapping.model);
    if (model) counts.set(model, (counts.get(model) ?? 0) + 1);
  }
  const needle = query.trim().toLowerCase();
  return [...counts.entries()]
    .filter(([model]) => !needle || model.toLowerCase().includes(needle))
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** One model's relationship to its equipment group. */
export interface GroupModelDatum {
  model: string;
  /** Repair-record rows carrying this group + model pair. */
  count: number;
  /** Share of the group's rows where Model is populated. */
  sharePct: number;
  /** Servicing companies, ranked by this model's record count. */
  companies: { company: string; count: number }[];
  /** Records with a final PASS or NOT PASS verdict. */
  completedRecords: number;
  /** PASS share of completed records, or null when none are completed. */
  passRate: number | null;
  /** Sum of positive reported repair amounts. */
  reportedAmount: number;
  pricedRecords: number;
}

/** Equipment-group summary with its ten most frequent model values. */
export interface GroupModelRelation {
  group: string;
  totalRecords: number;
  modelMappedRecords: number;
  distinctModels: number;
  topModels: GroupModelDatum[];
}

interface ModelRelationAccumulator {
  count: number;
  companies: Map<string, number>;
  pass: number;
  notPass: number;
  reportedAmount: number;
  pricedRecords: number;
}

interface GroupModelAccumulator {
  totalRecords: number;
  modelMappedRecords: number;
  models: Map<string, ModelRelationAccumulator>;
}

/**
 * Relate Group Equipment to Model directly from row-level sheet records.
 * Groups are ordered by activity; each group exposes its top ten models.
 */
export function selectGroupModelRelations(
  rows: CsvRow[],
  mapping: ColumnMapping,
): GroupModelRelation[] {
  if (!mapping.group || !mapping.model) return [];

  const groups = new Map<string, GroupModelAccumulator>();

  for (const row of rows) {
    const group = readColumn(row, mapping.group);
    if (!group) continue;

    const aggregate =
      groups.get(group) ??
      ({
        totalRecords: 0,
        modelMappedRecords: 0,
        models: new Map<string, ModelRelationAccumulator>(),
      } satisfies GroupModelAccumulator);
    aggregate.totalRecords += 1;

    const model = readColumn(row, mapping.model);
    if (model) {
      aggregate.modelMappedRecords += 1;
      const modelAggregate =
        aggregate.models.get(model) ??
        ({
          count: 0,
          companies: new Map<string, number>(),
          pass: 0,
          notPass: 0,
          reportedAmount: 0,
          pricedRecords: 0,
        } satisfies ModelRelationAccumulator);

      modelAggregate.count += 1;
      const company = readColumn(row, mapping.company);
      if (company) {
        modelAggregate.companies.set(
          company,
          (modelAggregate.companies.get(company) ?? 0) + 1,
        );
      }

      const status = readColumn(row, mapping.status).toUpperCase();
      if (status === "PASS") modelAggregate.pass += 1;
      if (status === "NOT PASS") modelAggregate.notPass += 1;

      const amount = toNumber(row[mapping.amount]);
      if (amount > 0) {
        modelAggregate.reportedAmount += amount;
        modelAggregate.pricedRecords += 1;
      }

      aggregate.models.set(model, modelAggregate);
    }

    groups.set(group, aggregate);
  }

  return [...groups.entries()]
    .map(([group, aggregate]) => ({
      group,
      totalRecords: aggregate.totalRecords,
      modelMappedRecords: aggregate.modelMappedRecords,
      distinctModels: aggregate.models.size,
      topModels: [...aggregate.models.entries()]
        .map(([model, modelAggregate]) => {
          const completedRecords =
            modelAggregate.pass + modelAggregate.notPass;
          return {
            model,
            count: modelAggregate.count,
            sharePct:
              aggregate.modelMappedRecords > 0
                ? (modelAggregate.count / aggregate.modelMappedRecords) * 100
                : 0,
            companies: [...modelAggregate.companies.entries()]
              .map(([company, count]) => ({ company, count }))
              .sort(
                (a, b) =>
                  b.count - a.count ||
                  a.company.localeCompare(b.company, undefined, {
                    sensitivity: "base",
                  }),
              ),
            completedRecords,
            passRate:
              completedRecords > 0
                ? (modelAggregate.pass / completedRecords) * 100
                : null,
            reportedAmount: modelAggregate.reportedAmount,
            pricedRecords: modelAggregate.pricedRecords,
          };
        })
        .sort(
          (a, b) =>
            b.count - a.count ||
            a.model.localeCompare(b.model, undefined, { sensitivity: "base" }),
        )
        .slice(0, 10),
    }))
    .filter((relation) => relation.distinctModels > 0)
    .sort(
      (a, b) =>
        b.totalRecords - a.totalRecords ||
        a.group.localeCompare(b.group, undefined, { sensitivity: "base" }),
    );
}

/** Everything the Model Deep Dive shows for one model. */
export interface ModelDetail {
  model: string;
  total: number;
  /** Records with a final verdict (PASS or NOT PASS). */
  completed: number;
  /** PASS share of completed records, or null when none are completed. */
  passRate: number | null;
  /** Mean repair amount where reported, or null when never reported. */
  avgCost: number | null;
  costCount: number;
  companyCount: number;
  monthLabels: string[];
  monthlyCounts: number[];
  statuses: StatusDatum[];
  topCauses: RankDatum[];
}

/** Aggregate one model's rows, or null when the model has no records. */
export function selectModelDetail(
  rows: CsvRow[],
  mapping: ColumnMapping,
  model: string,
): ModelDetail | null {
  if (!mapping.model) return null;

  const statusCount: Record<string, number> = {};
  const monthly = new Map<string, number>();
  const companies = new Set<string>();
  const causeCounts = new Map<string, number>();
  let total = 0;
  let costSum = 0;
  let costCount = 0;

  for (const row of rows) {
    if (readColumn(row, mapping.model) !== model) continue;
    total += 1;

    const status = (row[mapping.status] ?? "").trim().toUpperCase();
    if (status) statusCount[status] = (statusCount[status] ?? 0) + 1;

    const company = (row[mapping.company] ?? "").trim();
    if (company) companies.add(company);

    const ym = parseYM(row[mapping.ym]);
    if (ym) monthly.set(ym, (monthly.get(ym) ?? 0) + 1);

    const amount = toNumber(row[mapping.amount]);
    if (amount > 0) {
      costSum += amount;
      costCount += 1;
    }

    for (const token of splitCauseTokens(readColumn(row, mapping.cause))) {
      causeCounts.set(token, (causeCounts.get(token) ?? 0) + 1);
    }
  }

  if (total === 0) return null;

  const months = [...monthly.keys()].sort();
  const pass = statusCount["PASS"] ?? 0;
  const completed = pass + (statusCount["NOT PASS"] ?? 0);

  return {
    model,
    total,
    completed,
    passRate: completed > 0 ? (pass / completed) * 100 : null,
    avgCost: costCount > 0 ? costSum / costCount : null,
    costCount,
    companyCount: companies.size,
    monthLabels: months.map(formatYM),
    monthlyCounts: months.map((month) => monthly.get(month) ?? 0),
    statuses: Object.entries(statusCount)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        status,
        count,
        pct: (count / total) * 100,
      })),
    topCauses: [...causeCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  };
}

const MASKED_SERIAL = /^x+$/i;

/** Serials that identify a physical unit (not masked or placeholder). */
function isTrackableSerial(serial: string): boolean {
  return (
    serial.length > 2 &&
    !MASKED_SERIAL.test(serial) &&
    serial.toUpperCase() !== "N/A"
  );
}

/** One unit that entered repair more than once. */
export interface RepeatUnit {
  serial: string;
  material: string;
  model: string;
  company: string;
  cycles: number;
  rowCount: number;
}

/** Repeat-repair aggregates across trackable units. */
export interface RepeatAnalysis {
  trackedUnits: number;
  repeatUnits: number;
  repeatSharePct: number;
  maxCycles: number;
  byModel: RankDatum[];
  topUnits: RepeatUnit[];
}

interface UnitAgg {
  serial: string;
  material: string;
  model: string;
  company: string;
  rowCount: number;
  inputRows: number;
}

/**
 * Group rows by material+serial and count repair cycles. With Data Tab Sheet
 * mapped, one "Repaire_Input" row is one cycle; otherwise input/output pairs
 * are assumed (two rows per cycle). Masked serials are excluded.
 */
export function selectRepeatRepairs(
  rows: CsvRow[],
  mapping: ColumnMapping,
): RepeatAnalysis | null {
  if (!mapping.serial) return null;

  const units = new Map<string, UnitAgg>();
  let anyInput = false;

  for (const row of rows) {
    const serial = readColumn(row, mapping.serial);
    if (!isTrackableSerial(serial)) continue;

    const material = readColumn(row, mapping.material);
    const key = `${material}|${serial}`;
    const unit =
      units.get(key) ??
      ({
        serial,
        material,
        model: "",
        company: "",
        rowCount: 0,
        inputRows: 0,
      } satisfies UnitAgg);

    unit.rowCount += 1;
    if (!unit.model) unit.model = readColumn(row, mapping.model);
    if (!unit.company) unit.company = (row[mapping.company] ?? "").trim();
    if (/input/i.test(readColumn(row, mapping.tabSheet))) {
      unit.inputRows += 1;
      anyInput = true;
    }
    units.set(key, unit);
  }

  if (units.size === 0) return null;

  const cyclesOf = (unit: UnitAgg) =>
    anyInput ? Math.max(unit.inputRows, 1) : Math.max(1, Math.ceil(unit.rowCount / 2));

  const repeats: RepeatUnit[] = [...units.values()]
    .map((unit) => ({
      serial: unit.serial,
      material: unit.material,
      model: unit.model,
      company: unit.company,
      cycles: cyclesOf(unit),
      rowCount: unit.rowCount,
    }))
    .filter((unit) => unit.cycles >= 2);

  const byModelMap = new Map<string, number>();
  for (const unit of repeats) {
    const label = unit.model || "Unknown model";
    byModelMap.set(label, (byModelMap.get(label) ?? 0) + 1);
  }

  return {
    trackedUnits: units.size,
    repeatUnits: repeats.length,
    repeatSharePct: (repeats.length / units.size) * 100,
    maxCycles: repeats.reduce((max, unit) => Math.max(max, unit.cycles), 0),
    byModel: [...byModelMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    topUnits: [...repeats]
      .sort((a, b) => b.cycles - a.cycles || b.rowCount - a.rowCount)
      .slice(0, 15),
  };
}
