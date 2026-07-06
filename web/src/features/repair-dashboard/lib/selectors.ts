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
    companyStats.push({
      company,
      total: companyTotal,
      passCount,
      passRate: companyTotal > 0 ? (passCount / companyTotal) * 100 : 0,
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

  return {
    totalRecords,
    totalAmount: data.amount,
    passRate: totalRecords > 0 ? (passCount / totalRecords) * 100 : 0,
    topStatus,
    statuses: statusData(data.statusCount, dataset.allStatuses, totalRecords),
    activeStatuses: dataset.allStatuses.filter((s) => (data.statusCount[s] ?? 0) > 0),
    groups: monthlySeries(data.monthly, dataset.allMonths),
    data,
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
