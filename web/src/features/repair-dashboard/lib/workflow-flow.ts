import { isExcludedTabSheet, readColumn } from "./transform";
import type { ColumnMapping, CsvRow } from "./types";

/** Lifecycle shown by the flow selector. */
export type WorkflowFlowMode = "repair" | "claim";

/** Stable repair branch identifiers, in the order used by the flow chart. */
export type RepairWorkflowBranchId =
  | "ongoing"
  | "pass"
  | "notPass"
  | "claim";

/** Stable claim branch identifiers, in the order used by the flow chart. */
export type ClaimWorkflowBranchId = "outputClaim" | "ongoing";

export type WorkflowBranchKind = "unmatched-input" | "matched-output";

/** One right-hand branch in a lifecycle flow. */
export interface WorkflowFlowBranch<
  Id extends RepairWorkflowBranchId | ClaimWorkflowBranchId =
    | RepairWorkflowBranchId
    | ClaimWorkflowBranchId,
> {
  id: Id;
  label: string;
  count: number;
  kind: WorkflowBranchKind;
}

export interface RepairWorkflowFlowCounts {
  ongoing: number;
  pass: number;
  notPass: number;
  claim: number;
}

export interface ClaimWorkflowFlowCounts {
  outputClaim: number;
  ongoing: number;
}

export type WorkflowFlowCounts =
  | RepairWorkflowFlowCounts
  | ClaimWorkflowFlowCounts;

export type WorkflowFlowAvailabilityState =
  | "available"
  | "partial"
  | "unavailable";

export type WorkflowFlowMappingField =
  | "company"
  | "status"
  | "tabSheet"
  | "date"
  | "serial"
  | "material"
  | "ticket";

/** Whether a flow is safe to render and any data-quality caveats. */
export interface WorkflowFlowAvailability {
  /** Partial data is still renderable; unavailable data is not. */
  available: boolean;
  state: WorkflowFlowAvailabilityState;
  reason?: string;
  /** Missing fields which prevent lifecycle pairing/classification. */
  missingMappings: WorkflowFlowMappingField[];
  /** Optional identity fields omitted from the pairing key. */
  degradedMappings: Array<"material" | "ticket">;
  warnings: string[];
}

/** Pairing details retained so data problems never masquerade as outcomes. */
export interface WorkflowFlowDiagnostics {
  /** Kind-specific input/output rows in the full workflow history. */
  workflowInputRows: number;
  workflowOutputRows: number;
  /** Input rows in the reporting slice (the source of the displayed total). */
  reportingInputRows: number;
  /** Reporting inputs paired to an output, including unknown repair outcomes. */
  matchedInputRows: number;
  /** Reporting inputs without a paired output. */
  unmatchedInputRows: number;
  /** Reporting inputs which could not be assigned to a named branch. */
  unclassifiedInputRows: number;
  /** Valid, keyed output rows which had no earlier input in their FIFO. */
  orphanOutputRows: number;
  /** Full-history rows omitted from pairing because their dates are invalid. */
  invalidDateInputRows: number;
  invalidDateOutputRows: number;
  /** Full-history rows omitted from pairing because company/serial is blank. */
  missingIdentityInputRows: number;
  missingIdentityOutputRows: number;
  /** Full-history inputs left in a FIFO after every output was processed. */
  workflowUnmatchedInputRows: number;
  /** Reporting inputs not present by object identity in `workflowRows`. */
  reportingInputsOutsideWorkflow: number;
  /** Matched repair outputs whose status was not PASS, NOT PASS, or CLAIM. */
  unknownRepairOutputRows: number;
  unknownRepairOutputStatuses: Record<string, number>;
}

interface WorkflowFlowBase<
  Mode extends WorkflowFlowMode,
  Counts extends WorkflowFlowCounts,
  BranchId extends RepairWorkflowBranchId | ClaimWorkflowBranchId,
> {
  mode: Mode;
  input: {
    label: Mode extends "repair" ? "Repair" : "Claim";
    count: number;
  };
  counts: Counts;
  branches: WorkflowFlowBranch<BranchId>[];
  /** Number of in-scope input rows in `reportingRows`. */
  sourceTotal: number;
  /** Sum of the fixed, named branch counts. */
  classifiedTotal: number;
  /** `sourceTotal - classifiedTotal`; never hidden or relabelled. */
  unclassifiedCount: number;
  availability: WorkflowFlowAvailability;
  diagnostics: WorkflowFlowDiagnostics;
}

export type RepairWorkflowFlow = WorkflowFlowBase<
  "repair",
  RepairWorkflowFlowCounts,
  RepairWorkflowBranchId
>;

export type ClaimWorkflowFlow = WorkflowFlowBase<
  "claim",
  ClaimWorkflowFlowCounts,
  ClaimWorkflowBranchId
>;

export type WorkflowFlow = RepairWorkflowFlow | ClaimWorkflowFlow;

/** Both mode choices returned from one pass over the same reporting scope. */
export interface WorkflowFlows {
  repair: RepairWorkflowFlow;
  claim: ClaimWorkflowFlow;
}

type WorkflowDirection = "input" | "output";

interface WorkflowStage {
  mode: WorkflowFlowMode;
  direction: WorkflowDirection;
}

interface WorkflowEvent {
  row: CsvRow;
  time: number;
  direction: WorkflowDirection;
  sourceIndex: number;
}

interface PairingResult {
  pairedOutputs: WeakMap<CsvRow, CsvRow>;
  workflowRows: WeakSet<CsvRow>;
  diagnostics: Pick<
    WorkflowFlowDiagnostics,
    | "workflowInputRows"
    | "workflowOutputRows"
    | "orphanOutputRows"
    | "invalidDateInputRows"
    | "invalidDateOutputRows"
    | "missingIdentityInputRows"
    | "missingIdentityOutputRows"
    | "workflowUnmatchedInputRows"
  >;
}

const EMPTY_PAIRING_DIAGNOSTICS: PairingResult["diagnostics"] = {
  workflowInputRows: 0,
  workflowOutputRows: 0,
  orphanOutputRows: 0,
  invalidDateInputRows: 0,
  invalidDateOutputRows: 0,
  missingIdentityInputRows: 0,
  missingIdentityOutputRows: 0,
  workflowUnmatchedInputRows: 0,
};

/**
 * Recognize lifecycle sheets explicitly. A generic `Input`/`Output` value is
 * intentionally not enough: repair and claim FIFOs must never consume each
 * other's events. The source uses both `Repair` and `Repaire` spellings.
 */
function parseWorkflowStage(value: string): WorkflowStage | null {
  if (!value || isExcludedTabSheet(value)) return null;
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const repair = /REPAIRE?/.test(compact);
  const claim = compact.includes("CLAIM");
  const input = compact.includes("INPUT");
  const output = compact.includes("OUTPUT");

  // Ambiguous labels are safer left unclassified than cross-paired.
  if (repair === claim || input === output) return null;
  return {
    mode: repair ? "repair" : "claim",
    direction: input ? "input" : "output",
  };
}

/** Parse DD/MM/YYYY (and DD-MM-YYYY) without the browser's US-date ambiguity. */
function lifecycleTime(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);
  if (match) {
    const day = Number(match[1]);
    const month = Number(match[2]);
    const shortYear = Number(match[3]);
    const year = match[3].length === 2 ? 2000 + shortYear : shortYear;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return date.getTime();
  }

  // Live data occasionally contains ISO or named-month dates. Retain them as
  // a fallback while keeping numeric source dates explicitly day-first.
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function pairingKey(
  row: CsvRow,
  mapping: ColumnMapping,
  mode: WorkflowFlowMode,
): string | null {
  const company = readColumn(row, mapping.company);
  const serial = readColumn(row, mapping.serial);
  if (!company || !serial) return null;
  // A claim is returned to the vendor under a new repair ticket (TR No.), so a
  // claim's input and output rows never share one. Scoping claim pairing by
  // ticket would split every claim input from its output; serial (a stable
  // physical unit), with company and material, identifies it across tickets.
  const ticket = mode === "claim" ? "" : readColumn(row, mapping.ticket);
  return JSON.stringify([
    company,
    readColumn(row, mapping.material),
    serial,
    ticket,
  ]);
}

function matchesCompany(
  row: CsvRow,
  mapping: ColumnMapping,
  company: string | undefined,
): boolean {
  return company == null || readColumn(row, mapping.company) === company;
}

function isClaimStatus(row: CsvRow, mapping: ColumnMapping): boolean {
  return normalizedRepairStatus(readColumn(row, mapping.status)) === "CLAIM";
}

function eventDirectionForFlow(
  row: CsvRow,
  stage: WorkflowStage,
  mode: WorkflowFlowMode,
  mapping: ColumnMapping,
): WorkflowDirection | null {
  if (mode === "repair") {
    return stage.mode === "repair" ? stage.direction : null;
  }
  // A claim lifecycle event is any Input/Output stage row flagged as a claim,
  // either by an explicit Claim tab sheet or — the shape this dataset uses — a
  // CLAIM status recorded on the Repair Input / Repair Output stage. The input
  // side is where the claim starts ("input date is claim"); the output side is
  // its resolution. A claim input paired to an output is a completed claim; an
  // unpaired input is still ongoing; an output with no earlier input never
  // entered as a claim we count, so it is left as an orphan (diagnostics only).
  const claimFlagged = stage.mode === "claim" || isClaimStatus(row, mapping);
  return claimFlagged ? stage.direction : null;
}

function buildPairing(
  mode: WorkflowFlowMode,
  workflowRows: CsvRow[],
  mapping: ColumnMapping,
  company: string | undefined,
): PairingResult {
  const pairedOutputs = new WeakMap<CsvRow, CsvRow>();
  const workflowRowSet = new WeakSet<CsvRow>();
  const diagnostics = { ...EMPTY_PAIRING_DIAGNOSTICS };
  const units = new Map<string, WorkflowEvent[]>();

  for (const [sourceIndex, row] of workflowRows.entries()) {
    workflowRowSet.add(row);
    if (!matchesCompany(row, mapping, company)) continue;
    const stage = parseWorkflowStage(readColumn(row, mapping.tabSheet));
    if (!stage) continue;
    const direction = eventDirectionForFlow(row, stage, mode, mapping);
    if (!direction) continue;

    if (direction === "input") diagnostics.workflowInputRows += 1;
    else diagnostics.workflowOutputRows += 1;

    const time = lifecycleTime(readColumn(row, mapping.date));
    if (time == null) {
      if (direction === "input") diagnostics.invalidDateInputRows += 1;
      else diagnostics.invalidDateOutputRows += 1;
      continue;
    }

    const key = pairingKey(row, mapping, mode);
    if (key == null) {
      if (direction === "input") diagnostics.missingIdentityInputRows += 1;
      else diagnostics.missingIdentityOutputRows += 1;
      continue;
    }

    const events = units.get(key) ?? [];
    events.push({ row, time, direction, sourceIndex });
    units.set(key, events);
  }

  for (const events of units.values()) {
    // Put inputs first on equal dates: same-day lifecycle transitions are
    // valid even when sheet row order happens to list the output first.
    events.sort(
      (a, b) =>
        a.time - b.time ||
        (a.direction === b.direction ? 0 : a.direction === "input" ? -1 : 1) ||
        a.sourceIndex - b.sourceIndex,
    );
    const pending: WorkflowEvent[] = [];
    for (const event of events) {
      if (event.direction === "input") {
        pending.push(event);
        continue;
      }
      const input = pending.shift();
      if (!input) {
        diagnostics.orphanOutputRows += 1;
        continue;
      }
      pairedOutputs.set(input.row, event.row);
    }
    diagnostics.workflowUnmatchedInputRows += pending.length;
  }

  return { pairedOutputs, workflowRows: workflowRowSet, diagnostics };
}

function requiredMappings(mapping: ColumnMapping): WorkflowFlowMappingField[] {
  // Status is always required: repair outcomes (PASS/NOT PASS/CLAIM) and claim
  // rows are both identified by it. Ticket is intentionally not required —
  // repair pairing uses it only when present, and claim pairing ignores it.
  const required: WorkflowFlowMappingField[] = [
    "company",
    "tabSheet",
    "date",
    "serial",
    "status",
  ];
  return required.filter((field) => !mapping[field]);
}

function availabilityFor(
  mode: WorkflowFlowMode,
  mapping: ColumnMapping,
  sourceTotal: number,
  diagnostics: WorkflowFlowDiagnostics,
): WorkflowFlowAvailability {
  const missingMappings = requiredMappings(mapping);
  // Ticket refines repair pairing but is deliberately unused for claims, so a
  // missing ticket only degrades pairing quality in the repair flow.
  const degradable =
    mode === "claim"
      ? (["material"] as const)
      : (["material", "ticket"] as const);
  const degradedMappings = degradable.filter((field) => !mapping[field]);
  const warnings: string[] = [];

  if (degradedMappings.length) {
    warnings.push(
      `Pairing is less specific because ${degradedMappings.join(" and ")} ${
        degradedMappings.length === 1 ? "is" : "are"
      } not mapped.`,
    );
  }
  if (diagnostics.invalidDateInputRows || diagnostics.invalidDateOutputRows) {
    warnings.push(
      `${
        diagnostics.invalidDateInputRows + diagnostics.invalidDateOutputRows
      } workflow row(s) have a missing or invalid lifecycle date.`,
    );
  }
  if (
    diagnostics.missingIdentityInputRows ||
    diagnostics.missingIdentityOutputRows
  ) {
    warnings.push(
      `${
        diagnostics.missingIdentityInputRows +
        diagnostics.missingIdentityOutputRows
      } workflow row(s) have no company or serial identity.`,
    );
  }
  if (diagnostics.reportingInputsOutsideWorkflow) {
    warnings.push(
      `${diagnostics.reportingInputsOutsideWorkflow} reporting input row(s) are absent from the workflow history.`,
    );
  }
  if (diagnostics.unknownRepairOutputRows) {
    warnings.push(
      `${diagnostics.unknownRepairOutputRows} matched repair output(s) have an unknown status and remain unclassified.`,
    );
  }

  if (missingMappings.length) {
    return {
      available: false,
      state: "unavailable",
      reason: `Map ${missingMappings.join(", ")} to build the ${mode} lifecycle flow.`,
      missingMappings,
      degradedMappings,
      warnings,
    };
  }
  if (sourceTotal === 0) {
    return {
      available: false,
      state: "unavailable",
      reason: `No ${mode} input rows are available in the reporting scope.`,
      missingMappings,
      degradedMappings,
      warnings,
    };
  }
  return {
    available: true,
    state: warnings.length ? "partial" : "available",
    missingMappings,
    degradedMappings,
    warnings,
  };
}

function emptyDiagnostics(
  pairing: PairingResult["diagnostics"],
): WorkflowFlowDiagnostics {
  return {
    ...pairing,
    reportingInputRows: 0,
    matchedInputRows: 0,
    unmatchedInputRows: 0,
    unclassifiedInputRows: 0,
    reportingInputsOutsideWorkflow: 0,
    unknownRepairOutputRows: 0,
    unknownRepairOutputStatuses: {},
  };
}

function normalizedRepairStatus(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function selectRepairFlow(
  reportingRows: CsvRow[],
  workflowRows: CsvRow[],
  mapping: ColumnMapping,
  company: string | undefined,
): RepairWorkflowFlow {
  const pairing = buildPairing("repair", workflowRows, mapping, company);
  const diagnostics = emptyDiagnostics(pairing.diagnostics);
  const counts: RepairWorkflowFlowCounts = {
    ongoing: 0,
    pass: 0,
    notPass: 0,
    claim: 0,
  };
  const missingMappings = requiredMappings(mapping);

  for (const row of reportingRows) {
    if (!matchesCompany(row, mapping, company)) continue;
    const stage = parseWorkflowStage(readColumn(row, mapping.tabSheet));
    if (!stage || stage.mode !== "repair" || stage.direction !== "input") {
      continue;
    }

    diagnostics.reportingInputRows += 1;
    if (!pairing.workflowRows.has(row)) {
      diagnostics.reportingInputsOutsideWorkflow += 1;
    }
    if (missingMappings.length) {
      diagnostics.unclassifiedInputRows += 1;
      continue;
    }

    const output = pairing.pairedOutputs.get(row);
    if (!output) {
      counts.ongoing += 1;
      diagnostics.unmatchedInputRows += 1;
      continue;
    }

    diagnostics.matchedInputRows += 1;
    const status = normalizedRepairStatus(readColumn(output, mapping.status));
    if (status === "PASS") counts.pass += 1;
    else if (status === "NOT PASS" || status === "NOTPASS") counts.notPass += 1;
    else if (status === "CLAIM") counts.claim += 1;
    else {
      const label = status || "(blank)";
      diagnostics.unknownRepairOutputRows += 1;
      diagnostics.unknownRepairOutputStatuses[label] =
        (diagnostics.unknownRepairOutputStatuses[label] ?? 0) + 1;
      diagnostics.unclassifiedInputRows += 1;
    }
  }

  const sourceTotal = diagnostics.reportingInputRows;
  const classifiedTotal =
    counts.ongoing + counts.pass + counts.notPass + counts.claim;
  const unclassifiedCount = sourceTotal - classifiedTotal;
  // Keep this derived invariant authoritative if future classification rules
  // change without updating a diagnostic counter.
  diagnostics.unclassifiedInputRows = unclassifiedCount;

  return {
    mode: "repair",
    input: { label: "Repair", count: sourceTotal },
    counts,
    branches: [
      {
        id: "ongoing",
        label: "Ongoing",
        count: counts.ongoing,
        kind: "unmatched-input",
      },
      { id: "pass", label: "PASS", count: counts.pass, kind: "matched-output" },
      {
        id: "notPass",
        label: "NOT PASS",
        count: counts.notPass,
        kind: "matched-output",
      },
      {
        id: "claim",
        label: "CLAIM",
        count: counts.claim,
        kind: "matched-output",
      },
    ],
    sourceTotal,
    classifiedTotal,
    unclassifiedCount,
    availability: availabilityFor("repair", mapping, sourceTotal, diagnostics),
    diagnostics,
  };
}

function selectClaimFlow(
  reportingRows: CsvRow[],
  workflowRows: CsvRow[],
  mapping: ColumnMapping,
  company: string | undefined,
): ClaimWorkflowFlow {
  const pairing = buildPairing("claim", workflowRows, mapping, company);
  const diagnostics = emptyDiagnostics(pairing.diagnostics);
  const counts: ClaimWorkflowFlowCounts = { outputClaim: 0, ongoing: 0 };
  const missingMappings = requiredMappings(mapping);

  for (const row of reportingRows) {
    if (!matchesCompany(row, mapping, company)) continue;
    const stage = parseWorkflowStage(readColumn(row, mapping.tabSheet));
    if (!stage) continue;
    const direction = eventDirectionForFlow(row, stage, "claim", mapping);
    if (direction !== "input") continue;

    diagnostics.reportingInputRows += 1;
    if (!pairing.workflowRows.has(row)) {
      diagnostics.reportingInputsOutsideWorkflow += 1;
    }
    if (missingMappings.length) {
      diagnostics.unclassifiedInputRows += 1;
      continue;
    }

    if (pairing.pairedOutputs.has(row)) {
      counts.outputClaim += 1;
      diagnostics.matchedInputRows += 1;
    } else {
      counts.ongoing += 1;
      diagnostics.unmatchedInputRows += 1;
    }
  }

  const sourceTotal = diagnostics.reportingInputRows;
  const classifiedTotal = counts.outputClaim + counts.ongoing;
  const unclassifiedCount = sourceTotal - classifiedTotal;
  diagnostics.unclassifiedInputRows = unclassifiedCount;

  return {
    mode: "claim",
    input: { label: "Claim", count: sourceTotal },
    counts,
    branches: [
      {
        id: "outputClaim",
        label: "Output claim",
        count: counts.outputClaim,
        kind: "matched-output",
      },
      {
        id: "ongoing",
        label: "Ongoing",
        count: counts.ongoing,
        kind: "unmatched-input",
      },
    ],
    sourceTotal,
    classifiedTotal,
    unclassifiedCount,
    availability: availabilityFor("claim", mapping, sourceTotal, diagnostics),
    diagnostics,
  };
}

/**
 * Select repair and claim lifecycle flows from a reporting slice.
 *
 * Pairing always uses `workflowRows` (normally the complete raw history), but
 * only kind-specific input rows present in `reportingRows` contribute to the
 * displayed source total. Passing a company applies the same exact company
 * scope to both pairing and counting.
 */
export function selectWorkflowFlows(
  reportingRows: CsvRow[],
  workflowRows: CsvRow[],
  mapping: ColumnMapping,
  company?: string,
): WorkflowFlows {
  return {
    repair: selectRepairFlow(reportingRows, workflowRows, mapping, company),
    claim: selectClaimFlow(reportingRows, workflowRows, mapping, company),
  };
}
