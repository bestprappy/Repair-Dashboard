/** Domain types for the Repair Analytics dashboard. */

/** Maps required dashboard fields to the user's CSV column headers. */
export interface ColumnMapping {
  company: string;
  status: string;
  group: string;
  ym: string;
  amount: string;
  equipment?: string;
  model?: string;
  tabSheet?: string;
  cause?: string;
  subCause?: string;
  serial?: string;
  material?: string;
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
  /** status -> "YYYY-MM" -> record count (independent of amount). */
  statusMonthly: Record<string, Record<string, number>>;
  /** Record count per model. */
  modelCount: Record<string, number>;
  /** Record count per reported cause (sparse column). */
  causeCount: Record<string, number>;
  /** Record count per reported sub cause (sparse column). */
  subCauseCount: Record<string, number>;
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

/** Where the current dataset comes from. */
export type DataSource = "live" | "upload";

/** Selected view: aggregate of all companies or a single company name. */
export type DashboardView = "all" | (string & {});

/** Sentinel view name for the in-depth analysis page. */
export const INSIGHTS_VIEW = "__insights__";
