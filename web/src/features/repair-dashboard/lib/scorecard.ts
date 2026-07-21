/** Vendor scorecard: one composite grade per servicing company. */

import {
  evidenceStrength,
  isTrackableSerial,
  MIN_RECOMMENDATION_VERDICTS,
  wilsonLowerBound,
} from "./insights";
import type { EvidenceStrength } from "./insights";
import { selectSlaAnalysis } from "./sla";
import { readColumn, toNumber } from "./transform";
import type { ColumnMapping, CsvRow } from "./types";

/** Composite grade bands. Higher composite scores earn earlier letters. */
export type ScorecardGrade = "A" | "B" | "C" | "D" | "F";

/** Weights for the composite score. Only directional, target-bearing metrics
 * contribute: PASS quality (primary) and SLA compliance. Repeat repair and
 * cost stay descriptive and never move the grade, matching the model
 * recommendation methodology. */
export const QUALITY_WEIGHT = 0.7;
export const SLA_WEIGHT = 0.3;

/** Minimum completed SLA cycles before compliance is trusted in the grade. */
export const MIN_SLA_CYCLES = 5;
/** Minimum tracked units before a repeat rate is shown. */
export const MIN_REPEAT_UNITS = 5;
/** Minimum Material+Serial coverage before a repeat rate is shown. */
export const MIN_REPEAT_COVERAGE_PCT = 80;
/** Minimum priced rows before a median amount is shown. */
export const MIN_PRICED_ROWS = 5;

/** Grade band thresholds, checked high to low. */
const GRADE_BANDS: { grade: ScorecardGrade; min: number }[] = [
  { grade: "A", min: 90 },
  { grade: "B", min: 80 },
  { grade: "C", min: 70 },
  { grade: "D", min: 60 },
  { grade: "F", min: 0 },
];

function gradeOf(score: number): ScorecardGrade {
  return (
    GRADE_BANDS.find((band) => score >= band.min)?.grade ?? "F"
  );
}

/** One servicing company's blended performance across the dataset. */
export interface VendorScore {
  company: string;
  repairRecords: number;

  // Quality (PASS)
  passCount: number;
  completedVerdicts: number;
  passRate: number | null;
  /** 95% Wilson lower bound of completed PASS, 0–100. Backbone of the grade. */
  qualityScore: number | null;
  evidence: EvidenceStrength;

  // SLA turnaround
  slaCompletedCycles: number;
  slaMedianDays: number | null;
  slaCompliancePct: number | null;

  // Repeat repair (descriptive)
  trackedUnits: number;
  repeatUnits: number;
  repeatRate: number | null;
  identifierCoveragePct: number | null;

  // Cost (descriptive)
  pricedRecords: number;
  medianAmount: number | null;
  totalAmount: number;

  // Composite
  compositeScore: number | null;
  grade: ScorecardGrade | null;
  eligible: boolean;
  /** 1-based rank among eligible vendors, or null when unranked. */
  rank: number | null;
}

/** The full scorecard plus availability flags for the surrounding UI. */
export interface VendorScorecard {
  vendors: VendorScore[];
  eligibleCount: number;
  totalRecords: number;
  minimumVerdicts: number;
  targetDays: number;
  weights: { quality: number; sla: number };
  slaAvailable: boolean;
  repeatAvailable: boolean;
  costAvailable: boolean;
  identifiersMapped: boolean;
  bestVendor: VendorScore | null;
  /** Median SLA compliance across vendors that report it, or null. */
  medianCompliancePct: number | null;
}

interface UnitAccumulator {
  rowCount: number;
  inputRows: number;
}

interface VendorAccumulator {
  repairRecords: number;
  pass: number;
  notPass: number;
  amounts: number[];
  totalAmount: number;
  units: Map<string, UnitAccumulator>;
  trackableRows: number;
  hasInputStage: boolean;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Grade every servicing company. Eligible vendors (enough completed PASS/NOT
 * PASS verdicts) are ranked by a composite of PASS quality and SLA compliance;
 * vendors without enough verdicts are listed after, unranked, with whatever
 * descriptive evidence they have. Repeat repair and cost never move the grade.
 */
export function selectVendorScorecard(
  rows: CsvRow[],
  mapping: ColumnMapping,
  targetDays: number,
): VendorScorecard {
  const identifiersMapped = Boolean(mapping.serial && mapping.material);
  const sla = selectSlaAnalysis(rows, mapping, targetDays);
  const slaByCompany = new Map(
    sla.companies.map((company) => [company.company, company]),
  );

  const byCompany = new Map<string, VendorAccumulator>();

  for (const row of rows) {
    const company = readColumn(row, mapping.company);
    if (!company) continue;

    const acc =
      byCompany.get(company) ??
      ({
        repairRecords: 0,
        pass: 0,
        notPass: 0,
        amounts: [],
        totalAmount: 0,
        units: new Map<string, UnitAccumulator>(),
        trackableRows: 0,
        hasInputStage: false,
      } satisfies VendorAccumulator);
    acc.repairRecords += 1;

    const stage = readColumn(row, mapping.tabSheet);
    const isInput = /input/i.test(stage);

    // Verdicts and cost live on output (or unstaged) rows, never intake rows.
    if (!isInput) {
      const status = readColumn(row, mapping.status).toUpperCase();
      if (status === "PASS") acc.pass += 1;
      if (status === "NOT PASS") acc.notPass += 1;

      const amount = toNumber(row[mapping.amount]);
      if (amount > 0) {
        acc.amounts.push(amount);
        acc.totalAmount += amount;
      }
    }

    if (identifiersMapped) {
      const serial = readColumn(row, mapping.serial);
      const material = readColumn(row, mapping.material);
      if (material && isTrackableSerial(serial)) {
        acc.trackableRows += 1;
        const key = `${material}|${serial}`;
        const unit = acc.units.get(key) ?? { rowCount: 0, inputRows: 0 };
        unit.rowCount += 1;
        if (isInput) {
          unit.inputRows += 1;
          acc.hasInputStage = true;
        }
        acc.units.set(key, unit);
      }
    }

    byCompany.set(company, acc);
  }

  const vendors: VendorScore[] = [...byCompany.entries()].map(
    ([company, acc]) => {
      const completedVerdicts = acc.pass + acc.notPass;
      const passRate =
        completedVerdicts > 0 ? (acc.pass / completedVerdicts) * 100 : null;
      const qualityScore =
        completedVerdicts > 0
          ? wilsonLowerBound(acc.pass, completedVerdicts)
          : null;

      let repeatUnits = 0;
      for (const unit of acc.units.values()) {
        const cycles = acc.hasInputStage
          ? Math.max(unit.inputRows, 1)
          : Math.max(1, Math.ceil(unit.rowCount / 2));
        if (cycles >= 2) repeatUnits += 1;
      }
      const trackedUnits = acc.units.size;
      const identifierCoveragePct =
        identifiersMapped && acc.repairRecords > 0
          ? (acc.trackableRows / acc.repairRecords) * 100
          : null;
      const repeatRate =
        identifierCoveragePct != null &&
        identifierCoveragePct >= MIN_REPEAT_COVERAGE_PCT &&
        trackedUnits >= MIN_REPEAT_UNITS
          ? (repeatUnits / trackedUnits) * 100
          : null;

      const pricedRecords = acc.amounts.length;
      const medianAmount =
        pricedRecords >= MIN_PRICED_ROWS ? median(acc.amounts) : null;

      const slaEntry = slaByCompany.get(company);
      const slaCompletedCycles = slaEntry?.completed ?? 0;
      const slaMedianDays = slaEntry ? slaEntry.medianDays : null;
      const slaCompliancePct =
        slaEntry && slaCompletedCycles >= MIN_SLA_CYCLES
          ? slaEntry.compliancePct
          : null;

      const eligible =
        completedVerdicts >= MIN_RECOMMENDATION_VERDICTS &&
        qualityScore != null;

      let compositeScore: number | null = null;
      if (eligible && qualityScore != null) {
        compositeScore =
          slaCompliancePct != null
            ? QUALITY_WEIGHT * qualityScore + SLA_WEIGHT * slaCompliancePct
            : qualityScore;
      }

      return {
        company,
        repairRecords: acc.repairRecords,
        passCount: acc.pass,
        completedVerdicts,
        passRate,
        qualityScore,
        evidence: evidenceStrength(completedVerdicts),
        slaCompletedCycles,
        slaMedianDays,
        slaCompliancePct,
        trackedUnits,
        repeatUnits,
        repeatRate,
        identifierCoveragePct,
        pricedRecords,
        medianAmount,
        totalAmount: acc.totalAmount,
        compositeScore,
        grade: compositeScore != null ? gradeOf(compositeScore) : null,
        eligible,
        rank: null,
      };
    },
  );

  vendors.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    if (a.eligible && b.eligible) {
      const byScore = (b.compositeScore ?? 0) - (a.compositeScore ?? 0);
      if (Math.abs(byScore) > 1e-9) return byScore;
      const byVerdicts = b.completedVerdicts - a.completedVerdicts;
      if (byVerdicts !== 0) return byVerdicts;
    }
    return (
      b.repairRecords - a.repairRecords ||
      a.company.localeCompare(b.company, undefined, { sensitivity: "base" })
    );
  });

  let rank = 0;
  for (const vendor of vendors) {
    if (vendor.eligible) vendor.rank = ++rank;
  }

  const complianceValues = vendors
    .map((vendor) => vendor.slaCompliancePct)
    .filter((value): value is number => value != null);

  return {
    vendors,
    eligibleCount: rank,
    totalRecords: vendors.reduce(
      (sum, vendor) => sum + vendor.repairRecords,
      0,
    ),
    minimumVerdicts: MIN_RECOMMENDATION_VERDICTS,
    targetDays,
    weights: { quality: QUALITY_WEIGHT, sla: SLA_WEIGHT },
    slaAvailable: sla.available,
    repeatAvailable: vendors.some((vendor) => vendor.repeatRate != null),
    costAvailable: vendors.some((vendor) => vendor.medianAmount != null),
    identifiersMapped,
    bestVendor: vendors.find((vendor) => vendor.eligible) ?? null,
    medianCompliancePct: median(complianceValues),
  };
}
