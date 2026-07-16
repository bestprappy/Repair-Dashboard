import { readColumn } from "./transform";
import type { ColumnMapping, CsvRow } from "./types";

const DAY_MS = 86_400_000;

export interface SlaCycle {
  company: string;
  group: string;
  model: string;
  serial: string;
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
  medianDays: number | null;
  averageDays: number | null;
  compliancePct: number | null;
  overdueOpen: number;
  aging: { label: string; count: number }[];
  companies: { company: string; completed: number; medianDays: number; compliancePct: number }[];
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return null;
  const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
  const fallback = new Date(year, Number(match[2]) - 1, Number(match[1]));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Pair each input row with the next output row for the same material/serial. */
export function selectSlaAnalysis(rows: CsvRow[], mapping: ColumnMapping, targetDays: number): SlaAnalysis {
  const empty: SlaAnalysis = {
    available: false, targetDays, asOf: null, completed: [], open: [], medianDays: null,
    averageDays: null, compliancePct: null, overdueOpen: 0, aging: [], companies: [],
  };
  if (!mapping.date || !mapping.tabSheet || !mapping.serial) {
    return { ...empty, reason: "Map Lifecycle date, Workflow stage, and Serial number to calculate turnaround." };
  }

  const events = rows.flatMap((row) => {
    const date = parseDate(readColumn(row, mapping.date));
    const serial = readColumn(row, mapping.serial);
    const stage = readColumn(row, mapping.tabSheet);
    if (!date || !serial || !/(input|output)/i.test(stage)) return [];
    return [{ row, date, serial, stage }];
  });
  if (!events.some((event) => /input/i.test(event.stage)) || !events.some((event) => /output/i.test(event.stage))) {
    return { ...empty, reason: "Turnaround needs both input and output workflow rows with valid dates." };
  }

  const asOf = events.reduce((latest, event) => event.date > latest ? event.date : latest, events[0].date);
  const units = new Map<string, typeof events>();
  for (const event of events) {
    const material = readColumn(event.row, mapping.material);
    const key = `${material}|${event.serial}`;
    units.set(key, [...(units.get(key) ?? []), event]);
  }

  const completed: SlaCycle[] = [];
  const open: SlaCycle[] = [];
  for (const unitEvents of units.values()) {
    unitEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
    const pending: typeof unitEvents = [];
    for (const event of unitEvents) {
      if (/input/i.test(event.stage)) pending.push(event);
      else {
        const input = pending.shift();
        if (!input || event.date < input.date) continue;
        const days = Math.max(0, Math.ceil((event.date.getTime() - input.date.getTime()) / DAY_MS));
        completed.push({
          company: readColumn(input.row, mapping.company), group: readColumn(input.row, mapping.group),
          model: readColumn(input.row, mapping.model), serial: input.serial, receivedAt: input.date,
          completedAt: event.date, days, withinSla: days <= targetDays,
        });
      }
    }
    for (const input of pending) {
      const days = Math.max(0, Math.floor((asOf.getTime() - input.date.getTime()) / DAY_MS));
      open.push({
        company: readColumn(input.row, mapping.company), group: readColumn(input.row, mapping.group),
        model: readColumn(input.row, mapping.model), serial: input.serial, receivedAt: input.date,
        completedAt: null, days, withinSla: days <= targetDays,
      });
    }
  }

  const durations = completed.map((cycle) => cycle.days);
  const byCompany = new Map<string, SlaCycle[]>();
  for (const cycle of completed) byCompany.set(cycle.company || "Unknown", [...(byCompany.get(cycle.company || "Unknown") ?? []), cycle]);
  return {
    ...empty, available: true, asOf, completed, open,
    medianDays: durations.length ? median(durations) : null,
    averageDays: durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : null,
    compliancePct: durations.length ? completed.filter((cycle) => cycle.withinSla).length / durations.length * 100 : null,
    overdueOpen: open.filter((cycle) => !cycle.withinSla).length,
    aging: [
      { label: "0–7 days", count: open.filter((c) => c.days <= 7).length },
      { label: "8–14 days", count: open.filter((c) => c.days >= 8 && c.days <= 14).length },
      { label: "15–30 days", count: open.filter((c) => c.days >= 15 && c.days <= 30).length },
      { label: "31+ days", count: open.filter((c) => c.days >= 31).length },
    ],
    companies: [...byCompany.entries()].map(([company, cycles]) => ({
      company, completed: cycles.length, medianDays: median(cycles.map((c) => c.days)),
      compliancePct: cycles.filter((c) => c.withinSla).length / cycles.length * 100,
    })).sort((a, b) => a.compliancePct - b.compliancePct || b.completed - a.completed),
  };
}
