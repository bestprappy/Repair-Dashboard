import { isExcludedTabSheet, readColumn } from "./transform";
import type { ColumnMapping, CsvRow } from "./types";

const DAY_MS = 86_400_000;

export interface SlaCycle {
  company: string;
  group: string;
  equipment: string;
  model: string;
  material: string;
  serial: string;
  inputStatus: string;
  outputStatus: string | null;
  receivedAt: Date;
  completedAt: Date | null;
  days: number;
  withinSla: boolean;
}

export interface SlaAnalysis {
  available: boolean;
  reason?: string;
  targetDays: number;
  asOf: Date | null;
  completed: SlaCycle[];
  open: SlaCycle[];
  carryoverOpen: SlaCycle[];
  medianDays: number | null;
  averageDays: number | null;
  compliancePct: number | null;
  overdueOpen: number;
  aging: { label: string; minDays: number; maxDays: number | null; count: number }[];
  agingRanges: { label: string; minDays: number; maxDays: number | null; count: number }[];
  companies: { company: string; completed: number; medianDays: number; compliancePct: number }[];
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Source dates are DD/MM/YYYY; parse that before falling back to new Date()
  // so day-<=-12 dates aren't misread as US MM/DD (see workflowDateTime).
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    const parsed = new Date(year, Number(match[2]) - 1, Number(match[1]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const direct = new Date(trimmed);
  return Number.isNaN(direct.getTime()) ? null : direct;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Pair each input row with the next output row for the same material/serial. */
export function selectSlaAnalysis(rows: CsvRow[], mapping: ColumnMapping, targetDays: number, reportingYear?: number): SlaAnalysis {
  const empty: SlaAnalysis = {
    available: false, targetDays, asOf: null, completed: [], open: [], medianDays: null,
    averageDays: null, compliancePct: null, overdueOpen: 0, aging: [], agingRanges: [], companies: [], carryoverOpen: [],
  };
  if (!mapping.date || !mapping.tabSheet || !mapping.serial) {
    return { ...empty, reason: "Map Lifecycle date, Workflow stage, and Serial number to calculate turnaround." };
  }

  const events = rows.flatMap((row) => {
    const date = parseDate(readColumn(row, mapping.date));
    const serial = readColumn(row, mapping.serial);
    const stage = readColumn(row, mapping.tabSheet);
    if (!date || !serial || isExcludedTabSheet(stage) || !/(input|output)/i.test(stage)) return [];
    return [{ row, date, serial, stage }];
  });
  if (!events.some((event) => /input/i.test(event.stage)) || !events.some((event) => /output/i.test(event.stage))) {
    return { ...empty, reason: "Turnaround needs both input and output workflow rows with valid dates." };
  }

  const asOf = events.reduce((latest, event) => event.date > latest ? event.date : latest, events[0].date);
  const units = new Map<string, typeof events>();
  for (const event of events) {
    const material = readColumn(event.row, mapping.material);
    // Scope pairing to one repair ticket so a unit's separate cycles don't
    // cross-link (see buildDataset). Ticket is optional; empty keeps serial
    // grouping for datasets without a TR No. column.
    const ticket = readColumn(event.row, mapping.ticket);
    const key = `${material}|${event.serial}|${ticket}`;
    units.set(key, [...(units.get(key) ?? []), event]);
  }

  const allCompleted: SlaCycle[] = [];
  const allOpen: SlaCycle[] = [];
  for (const unitEvents of units.values()) {
    unitEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    const pending: typeof unitEvents = [];
    for (const event of unitEvents) {
      if (/input/i.test(event.stage)) pending.push(event);
      else {
        const input = pending.shift();
        if (!input || event.date < input.date) continue;
        const days = Math.max(0, Math.ceil((event.date.getTime() - input.date.getTime()) / DAY_MS));
        allCompleted.push({
          company: readColumn(input.row, mapping.company), group: readColumn(input.row, mapping.group),
          equipment: readColumn(input.row, mapping.equipment), model: readColumn(input.row, mapping.model),
          material: readColumn(input.row, mapping.material), serial: input.serial, receivedAt: input.date,
          inputStatus: readColumn(input.row, mapping.status), outputStatus: readColumn(event.row, mapping.status) || null,
          completedAt: event.date, days, withinSla: days <= targetDays,
        });
      }
    }
    for (const input of pending) {
      const days = Math.max(0, Math.floor((asOf.getTime() - input.date.getTime()) / DAY_MS));
      allOpen.push({
        company: readColumn(input.row, mapping.company), group: readColumn(input.row, mapping.group),
        equipment: readColumn(input.row, mapping.equipment), model: readColumn(input.row, mapping.model),
        material: readColumn(input.row, mapping.material), serial: input.serial, receivedAt: input.date,
        inputStatus: readColumn(input.row, mapping.status), outputStatus: null,
        completedAt: null, days, withinSla: days <= targetDays,
      });
    }
  }

  const inReportingYear = (cycle: SlaCycle) =>
    reportingYear == null || cycle.receivedAt.getFullYear() === reportingYear;
  const completed = allCompleted.filter(inReportingYear);
  const open = allOpen.filter(inReportingYear);
  const carryoverOpen = reportingYear == null
    ? []
    : allOpen.filter((cycle) => cycle.receivedAt.getFullYear() < reportingYear);
  const traceableOpen = [...open, ...carryoverOpen];

  const durations = completed.map((cycle) => cycle.days);
  const byCompany = new Map<string, SlaCycle[]>();
  for (const cycle of completed) byCompany.set(cycle.company || "Unknown", [...(byCompany.get(cycle.company || "Unknown") ?? []), cycle]);
  return {
    ...empty, available: true, asOf, completed, open, carryoverOpen,
    medianDays: durations.length ? median(durations) : null,
    averageDays: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null,
    compliancePct: durations.length ? completed.filter((cycle) => cycle.withinSla).length / durations.length * 100 : null,
    overdueOpen: open.filter((cycle) => !cycle.withinSla).length,
    aging: [
      { label: "More than 1 month", minDays: 30, maxDays: null, count: traceableOpen.filter((c) => c.days > 30).length },
      { label: "More than 3 months", minDays: 90, maxDays: null, count: traceableOpen.filter((c) => c.days > 90).length },
      { label: "More than 6 months", minDays: 180, maxDays: null, count: traceableOpen.filter((c) => c.days > 180).length },
      { label: "More than 9 months", minDays: 270, maxDays: null, count: traceableOpen.filter((c) => c.days > 270).length },
      { label: "More than 1 year", minDays: 365, maxDays: null, count: traceableOpen.filter((c) => c.days > 365).length },
    ],
    agingRanges: [
      { label: "0–30 days", minDays: -1, maxDays: 30, count: traceableOpen.filter((c) => c.days <= 30).length },
      { label: "31–90 days", minDays: 30, maxDays: 90, count: traceableOpen.filter((c) => c.days > 30 && c.days <= 90).length },
      { label: "91–180 days", minDays: 90, maxDays: 180, count: traceableOpen.filter((c) => c.days > 90 && c.days <= 180).length },
      { label: "181–270 days", minDays: 180, maxDays: 270, count: traceableOpen.filter((c) => c.days > 180 && c.days <= 270).length },
      { label: "271–365 days", minDays: 270, maxDays: 365, count: traceableOpen.filter((c) => c.days > 270 && c.days <= 365).length },
      { label: "366+ days", minDays: 365, maxDays: null, count: traceableOpen.filter((c) => c.days > 365).length },
    ],
    companies: [...byCompany.entries()].map(([company, cycles]) => ({
      company, completed: cycles.length, medianDays: median(cycles.map((c) => c.days)),
      compliancePct: cycles.filter((c) => c.withinSla).length / cycles.length * 100,
    })).sort((a, b) => a.compliancePct - b.compliancePct || b.completed - a.completed),
  };
}
