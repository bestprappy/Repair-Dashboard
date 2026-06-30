/** Domain types for the Repair Analytics dashboard. */

/** Maps required dashboard fields to the user's CSV column headers. */
export interface ColumnMapping {
  company: string;
  status: string;
  group: string;
  ym: string;
  amount: string;
  equipment?: string;
}

/** Aggregated count + amount for a single equipment group within a status. */
export interface GroupStat {
  count: number;
  amount: number;
}

/** All aggregates computed for one company. */
export interface CompanyData {
  /** Plain record count per status. */
  statusCount: Record<string, number>;
  /** status -> group -> {count, amount}. */
  statusGroups: Record<string, Record<string, GroupStat>>;
  /** group -> "YYYY-MM" -> summed amount (amount > 0 and valid month only). */
  monthly: Record<string, Record<string, number>>;
  /** Total amount across every row, date-independent. */
  amount: number;
}

/** The full processed dataset rendered by the dashboard. */
export interface RepairDataset {
  companies: Record<string, CompanyData>;
  /** Ordered list of every status seen. */
  allStatuses: string[];
  /** Sorted list of every "YYYY-MM" key seen (chart X-axis). */
  allMonths: string[];
  /** Total record count across all companies. */
  grandTotal: number;
}

/** A single parsed CSV row keyed by column header. */
export type CsvRow = Record<string, string>;

/** Stage of the upload -> map -> dashboard flow. */
export type DashboardStage = "upload" | "map" | "loading" | "dash";

/** Selected view: aggregate of all companies or a single company name. */
export type DashboardView = "all" | (string & {});
