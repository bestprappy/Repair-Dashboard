import { statusTone } from "./transform";
import type { CompanyData, RepairDataset } from "./types";

/** A status with its record count and palette color. */
export interface StatusDatum {
  status: string;
  count: number;
  pct: number;
}

/** A group's monthly amount series, aligned to dataset.allMonths. */
export interface GroupSeries {
  group: string;
  /** amount per month, in allMonths order. */
  values: number[];
  total: number;
}

/** A group's count + amount within a single status. */
export interface GroupCountDatum {
  group: string;
  count: number;
  amount: number;
}

/** One model/equipment row in the equipment-group status detail table. */
export interface GroupStatusDetailDatum {
  status: string;
  group: string;
  model: string;
  equipment: string;
  inputDate: string;
  outputDate: string;
  count: number;
  amount: number;
}

/** Sidebar entry: a company and its total record count. */
export interface CompanyNavItem {
  company: string;
  count: number;
}

/** Per-company totals: overall repair count and PASS rate. */
export interface CompanyStatDatum {
  company: string;
  total: number;
  passCount: number;
  passRate: number;
}

function statusData(
  statusCount: Record<string, number>,
  allStatuses: string[],
  total: number,
): StatusDatum[] {
  return allStatuses.map((status) => {
    const count = statusCount[status] ?? 0;
    return { status, count, pct: total > 0 ? (count / total) * 100 : 0 };
  });
}

function monthlySeries(
  monthly: Record<string, Record<string, number>>,
  allMonths: string[],
): GroupSeries[] {
  return Object.entries(monthly)
    .map(([group, byMonth]) => {
      const values = allMonths.map((month) => byMonth[month] ?? 0);
      return { group, values, total: values.reduce((a, b) => a + b, 0) };
    })
    .filter((series) => series.values.some((v) => v > 0))
    .sort((a, b) => a.group.localeCompare(b.group));
}

export interface AllCompaniesView {
  grandTotal: number;
  grandAmount: number;
  companyCount: number;
  statuses: StatusDatum[];
  groups: GroupSeries[];
  nav: CompanyNavItem[];
  /** Per-company repair totals and PASS rates, sorted by total desc. */
  companyStats: CompanyStatDatum[];
}

/** Aggregate view across every company. */
export function selectAllCompanies(dataset: RepairDataset): AllCompaniesView {
  const entries = Object.entries(dataset.companies);
  const statusCount: Record<string, number> = {};
  const combinedMonthly: Record<string, Record<string, number>> = {};
  let grandAmount = 0;
  const nav: CompanyNavItem[] = [];
  const companyStats: CompanyStatDatum[] = [];

  for (const [company, data] of entries) {
    let companyTotal = 0;
    for (const [status, count] of Object.entries(data.statusCount)) {
      statusCount[status] = (statusCount[status] ?? 0) + count;
      companyTotal += count;
    }
    grandAmount += data.amount;
    nav.push({ company, count: companyTotal });

    const passCount = data.statusCount["PASS"] ?? 0;
    const completedCount = passCount + (data.statusCount["NOT PASS"] ?? 0);
    companyStats.push({
      company,
      total: companyTotal,
      passCount,
      passRate: completedCount > 0 ? (passCount / completedCount) * 100 : 0,
    });

    for (const [group, byMonth] of Object.entries(data.monthly)) {
      const target = (combinedMonthly[group] ??= {});
      for (const [month, value] of Object.entries(byMonth)) {
        target[month] = (target[month] ?? 0) + value;
      }
    }
  }

  return {
    grandTotal: dataset.grandTotal,
    grandAmount,
    companyCount: entries.length,
    statuses: statusData(statusCount, dataset.allStatuses, dataset.grandTotal),
    groups: monthlySeries(combinedMonthly, dataset.allMonths),
    nav,
    companyStats: companyStats.sort((a, b) => b.total - a.total),
  };
}

export interface CompanyView {
  totalRecords: number;
  totalAmount: number;
  passRate: number;
  topStatus: { status: string; count: number } | null;
  statuses: StatusDatum[];
  /** Statuses that have at least one record, in dataset order. */
  activeStatuses: string[];
  groups: GroupSeries[];
  data: CompanyData;
}

/** Detailed view for a single company. */
export function selectCompany(
  dataset: RepairDataset,
  company: string,
): CompanyView | null {
  const data = dataset.companies[company];
  if (!data) return null;

  let totalRecords = 0;
  let topStatus: { status: string; count: number } | null = null;
  for (const status of dataset.allStatuses) {
    const count = data.statusCount[status] ?? 0;
    totalRecords += count;
    if (count > 0 && (!topStatus || count > topStatus.count)) {
      topStatus = { status, count };
    }
  }

  const passCount = data.statusCount["PASS"] ?? 0;
  const completedCount = passCount + (data.statusCount["NOT PASS"] ?? 0);

  return {
    totalRecords,
    totalAmount: data.amount,
    passRate: completedCount > 0 ? (passCount / completedCount) * 100 : 0,
    topStatus,
    statuses: statusData(data.statusCount, dataset.allStatuses, totalRecords),
    activeStatuses: dataset.allStatuses.filter((s) => (data.statusCount[s] ?? 0) > 0),
    groups: monthlySeries(data.monthly, dataset.allMonths),
    data,
  };
}

/** Monthly REPAIR-intake demand for the selected dashboard scope. */
export interface RepairDemandView {
  /** Intake record count per month, aligned to dataset.allMonths. */
  values: number[];
  /** Total intake records across the displayed months. */
  total: number;
  /** Arithmetic mean of the displayed monthly counts. */
  mean: number | null;
  /** Median of the displayed monthly counts. */
  median: number | null;
}

/**
 * Select monthly repair demand for all companies or one company. The REPAIR
 * status series is populated from Repaire_Input rows whenever workflow stages
 * are mapped. Zero-demand buckets remain in the calculation so the reference
 * lines describe the complete displayed period.
 */
export function selectRepairDemand(
  dataset: RepairDataset,
  company?: string,
): RepairDemandView {
  const scopedData = company
    ? dataset.companies[company]
      ? [dataset.companies[company]]
      : []
    : Object.values(dataset.companies);
  const values = dataset.allMonths.map((month) =>
    scopedData.reduce(
      (sum, data) => sum + (data.statusMonthly.REPAIR?.[month] ?? 0),
      0,
    ),
  );
  const total = values.reduce((sum, value) => sum + value, 0);

  if (values.length === 0) {
    return { values, total, mean: null, median: null };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];

  return {
    values,
    total,
    mean: total / values.length,
    median,
  };
}

/** Monthly repair spend for the selected dashboard scope. */
export interface MonthlySpendView {
  /** Positive reported repair amounts per month, aligned to dataset.allMonths. */
  values: number[];
  /** Total positive reported repair amount across the displayed months. */
  total: number;
  /** Arithmetic mean across every displayed month, including zero-spend months. */
  average: number | null;
}

/** Aggregate group-level monthly amounts for all companies or one company. */
export function selectMonthlySpend(
  dataset: RepairDataset,
  company?: string,
): MonthlySpendView {
  const scopedData = company
    ? dataset.companies[company]
      ? [dataset.companies[company]]
      : []
    : Object.values(dataset.companies);
  const values = dataset.allMonths.map((month) =>
    scopedData.reduce(
      (companySum, data) =>
        companySum +
        Object.values(data.monthly).reduce(
          (groupSum, byMonth) => groupSum + (byMonth[month] ?? 0),
          0,
        ),
      0,
    ),
  );
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    values,
    total,
    average: values.length > 0 ? total / values.length : null,
  };
}

/** A labeled count for ranked bar charts and donuts. */
export interface RankDatum {
  label: string;
  count: number;
}

/** One status's record count per month, aligned to dataset.allMonths. */
export interface StatusMonthlySeries {
  status: string;
  values: number[];
  total: number;
}

/** Extra chart slices derived from the optional columns. */
export interface BreakdownView {
  /** Stacked monthly record counts per status ("OTHER" holds rare ones). */
  statusMonthly: StatusMonthlySeries[];
  /** Total records per month, aligned to dataset.allMonths. */
  monthTotals: number[];
  topModels: RankDatum[];
  topGroups: RankDatum[];
  topCauses: RankDatum[];
  topSubCauses: RankDatum[];
  /** Percentage of records that report a cause / sub cause. */
  causeCoveragePct: number;
  subCauseCoveragePct: number;
}

/** Legend label for statuses folded together in the stacked monthly chart. */
export const OTHER_STATUS = "OTHER";

/** Statuses below this share of records fold into OTHER in the stack. */
const MIN_STACK_SHARE = 0.01;

/**
 * Fixed stack order chosen so adjacent status colors stay distinguishable
 * for color-vision-deficient readers (green → blue → amber → red).
 */
const TONE_STACK_RANK: Record<string, number> = {
  good: 0,
  claim: 1,
  warning: 2,
  noFault: 3,
  bad: 4,
};

function statusStackRank(status: string): number {
  const tone = statusTone(status);
  return tone ? TONE_STACK_RANK[tone] : 5;
}

function mergeCounts(maps: Record<string, number>[]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const map of maps) {
    for (const [label, count] of Object.entries(map)) {
      merged.set(label, (merged.get(label) ?? 0) + count);
    }
  }
  return merged;
}

function rankTop(merged: Map<string, number>, limit: number): RankDatum[] {
  return [...merged.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function sumCounts(merged: Map<string, number>): number {
  let sum = 0;
  for (const count of merged.values()) sum += count;
  return sum;
}

/**
 * Build the breakdown slices for the whole dataset or a single company.
 * Every chart tolerates the optional columns being unmapped (empty arrays).
 */
export function selectBreakdown(
  dataset: RepairDataset,
  company?: string,
): BreakdownView {
  const companyData = company
    ? dataset.companies[company]
      ? [dataset.companies[company]]
      : []
    : Object.values(dataset.companies);
  const { allMonths } = dataset;

  let totalRecords = 0;
  const statusTotals: Record<string, number> = {};
  const statusMonthly: Record<string, Record<string, number>> = {};
  for (const data of companyData) {
    for (const [status, count] of Object.entries(data.statusCount)) {
      statusTotals[status] = (statusTotals[status] ?? 0) + count;
      totalRecords += count;
    }
    for (const [status, byMonth] of Object.entries(data.statusMonthly)) {
      const target = (statusMonthly[status] ??= {});
      for (const [month, count] of Object.entries(byMonth)) {
        target[month] = (target[month] ?? 0) + count;
      }
    }
  }

  const present = dataset.allStatuses.filter((s) => (statusTotals[s] ?? 0) > 0);
  const major = present
    .filter((s) => statusTotals[s] >= totalRecords * MIN_STACK_SHARE)
    .sort(
      (a, b) =>
        statusStackRank(a) - statusStackRank(b) ||
        statusTotals[b] - statusTotals[a],
    );
  const minor = present.filter((s) => !major.includes(s));

  const monthlySeries: StatusMonthlySeries[] = major.map((status) => {
    const byMonth = statusMonthly[status] ?? {};
    const values = allMonths.map((month) => byMonth[month] ?? 0);
    return { status, values, total: values.reduce((a, b) => a + b, 0) };
  });
  if (minor.length > 0) {
    const values = allMonths.map((month) =>
      minor.reduce((sum, s) => sum + (statusMonthly[s]?.[month] ?? 0), 0),
    );
    monthlySeries.push({
      status: OTHER_STATUS,
      values,
      total: values.reduce((a, b) => a + b, 0),
    });
  }
  const activeSeries = monthlySeries.filter((series) => series.total > 0);
  const monthTotals = allMonths.map((_, index) =>
    activeSeries.reduce((sum, series) => sum + series.values[index], 0),
  );

  const groupCounts = companyData.map((data) => {
    const counts: Record<string, number> = {};
    for (const groups of Object.values(data.statusGroups)) {
      for (const [group, stat] of Object.entries(groups)) {
        counts[group] = (counts[group] ?? 0) + stat.count;
      }
    }
    return counts;
  });

  const causes = mergeCounts(companyData.map((data) => data.causeCount));
  const subCauses = mergeCounts(companyData.map((data) => data.subCauseCount));
  const pctOf = (part: number) =>
    totalRecords > 0 ? (part / totalRecords) * 100 : 0;

  return {
    statusMonthly: activeSeries,
    monthTotals,
    topModels: rankTop(mergeCounts(companyData.map((d) => d.modelCount)), 10),
    topGroups: rankTop(mergeCounts(groupCounts), 10),
    topCauses: rankTop(causes, 10),
    topSubCauses: rankTop(subCauses, 10),
    causeCoveragePct: pctOf(sumCounts(causes)),
    subCauseCoveragePct: pctOf(sumCounts(subCauses)),
  };
}

/** Group count/amount rows for one status within a company, sorted by group. */
export function selectStatusGroups(
  data: CompanyData,
  status: string,
): GroupCountDatum[] {
  const groups = data.statusGroups[status] ?? {};
  return Object.keys(groups)
    .sort()
    .map((group) => ({
      group,
      count: groups[group].count,
      amount: groups[group].amount,
    }));
}

/** Flatten company group aggregates for the drill-down table. */
export function selectGroupStatusDetails(
  data: CompanyData,
): GroupStatusDetailDatum[] {
  const rows: GroupStatusDetailDatum[] = [];
  for (const [status, groups] of Object.entries(data.statusGroups)) {
    for (const [group, stat] of Object.entries(groups)) {
      for (const detail of Object.values(stat.details ?? {})) {
        rows.push({ status, group, ...detail });
      }
    }
  }
  return rows.sort(
    (a, b) =>
      // Missing input dates are intentionally surfaced first for follow-up;
      // dated repairs then run from the oldest intake to the newest.
      Number(Boolean(a.inputDate)) - Number(Boolean(b.inputDate)) ||
      detailDateTime(a.inputDate) - detailDateTime(b.inputDate) ||
      a.status.localeCompare(b.status) ||
      a.group.localeCompare(b.group) ||
      b.count - a.count ||
      a.model.localeCompare(b.model),
  );
}

function detailDateTime(value: string): number {
  if (!value) return 0;
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return new Date(year, Number(match[2]) - 1, Number(match[1])).getTime();
  }
  const direct = new Date(value).getTime();
  return Number.isNaN(direct) ? Number.MAX_SAFE_INTEGER : direct;
}
