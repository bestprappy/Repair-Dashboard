"use client";

import { useMemo, useState } from "react";

import { Boxes, Download, History, Repeat } from "lucide-react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import { MetricCard } from "@/components/metric-card";
import { Pager } from "@/components/pager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { RankBarChart } from "./charts";
import { selectRepeatRepairs } from "../lib/insights";
import type { RepeatUnit } from "../lib/insights";
import { formatDisplayDate, paletteColor, readColumn, statusColor } from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";

interface RepeatRepairsSectionProps {
  rows: CsvRow[];
  historyRows?: CsvRow[];
  mapping: ColumnMapping;
  onSelectUnit?: (unit: RepeatUnit) => void;
}

const PAGE_SIZE = 10;

function unitKey(unit: Pick<RepeatUnit, "material" | "serial">): string {
  return `${unit.material}|${unit.serial}`;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/** Same ascending lifecycle ordering used by the record explorer timeline. */
function lifecycleTime(value: string): number {
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return new Date(year, Number(match[2]) - 1, Number(match[1])).getTime();
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function downloadCsv(lines: string[], filename: string): void {
  const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Units that entered repair more than once: summary, by model, worst list. */
export function RepeatRepairsSection({ rows, historyRows = rows, mapping, onSelectUnit }: RepeatRepairsSectionProps) {
  const [breakdown, setBreakdown] = useState<"model" | "equipment">("model");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [chartPage, setChartPage] = useState(0);
  const [tablePage, setTablePage] = useState(0);
  const [timelineUnit, setTimelineUnit] = useState<RepeatUnit | null>(null);
  const [selectingForExport, setSelectingForExport] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const analysis = useMemo(
    () => selectRepeatRepairs(rows, mapping, historyRows),
    [rows, mapping, historyRows],
  );

  if (!analysis) return null;

  const breakdownData = breakdown === "model" ? analysis.byModel : analysis.byEquipment;
  const chartPageCount = Math.max(1, Math.ceil(breakdownData.length / PAGE_SIZE));
  const safeChartPage = Math.min(chartPage, chartPageCount - 1);
  const chartItems = breakdownData.slice(safeChartPage * PAGE_SIZE, (safeChartPage + 1) * PAGE_SIZE);
  const tableUnits = selectedLabel
    ? analysis.topUnits.filter((unit) =>
        breakdown === "model"
          ? (unit.model || "Unknown model") === selectedLabel
          : (unit.group || "Unknown equipment") === selectedLabel,
      )
    : analysis.topUnits;
  const tablePageCount = Math.max(1, Math.ceil(tableUnits.length / PAGE_SIZE));
  const safeTablePage = Math.min(tablePage, tablePageCount - 1);
  const visibleUnits = tableUnits.slice(safeTablePage * PAGE_SIZE, (safeTablePage + 1) * PAGE_SIZE);
  const allFilteredSelected = tableUnits.length > 0 && tableUnits.every((unit) => selectedUnits.has(unitKey(unit)));

  const toggleUnit = (unit: RepeatUnit) => {
    const key = unitKey(unit);
    setSelectedUnits((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedUnits((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        for (const unit of tableUnits) next.delete(unitKey(unit));
      } else {
        for (const unit of tableUnits) next.add(unitKey(unit));
      }
      return next;
    });
  };

  const selectedInTableOrder = () =>
    tableUnits.filter((unit) => selectedUnits.has(unitKey(unit)));

  const finishExport = () => {
    setSelectingForExport(false);
    setSelectedUnits(new Set());
  };

  const downloadDetailedCsv = () => {
    const selected = selectedInTableOrder();
    if (selected.length === 0) return;
    const order = new Map(selected.map((unit, index) => [unitKey(unit), index]));
    const exportRows = historyRows
      .filter((row) => order.has(`${readColumn(row, mapping.material)}|${readColumn(row, mapping.serial)}`))
      .map((row, sourceIndex) => ({ row, sourceIndex }))
      .sort((a, b) => {
        const aKey = `${readColumn(a.row, mapping.material)}|${readColumn(a.row, mapping.serial)}`;
        const bKey = `${readColumn(b.row, mapping.material)}|${readColumn(b.row, mapping.serial)}`;
        return (
          (order.get(aKey) ?? Number.MAX_SAFE_INTEGER) - (order.get(bKey) ?? Number.MAX_SAFE_INTEGER) ||
          lifecycleTime(readColumn(a.row, mapping.date)) - lifecycleTime(readColumn(b.row, mapping.date)) ||
          a.sourceIndex - b.sourceIndex
        );
      })
      .map(({ row }) => row);
    const fields = [...new Set(historyRows.flatMap((row) => Object.keys(row)))];
    const lines = [
      fields.map(csvCell).join(","),
      ...exportRows.map((row) => fields.map((field) => csvCell(row[field] ?? "")).join(",")),
    ];
    downloadCsv(lines, "repeat-unit-timelines.csv");
  };

  const downloadSummaryCsv = () => {
    const selected = selectedInTableOrder();
    if (selected.length === 0) return;
    const headings = [
      "Serial",
      "Material",
      "Model",
      "Equipment group",
      "Equipment",
      "Company",
      "First timeline event",
      "Latest timeline event",
      "Timeline events",
      "Input rows",
      "Output rows",
      "All rows",
      "Cycles",
    ];
    const lines = [
      headings.map(csvCell).join(","),
      ...selected.map((unit) =>
        [
          unit.serial,
          unit.material,
          unit.model,
          unit.group,
          unit.equipment,
          unit.company,
          unit.timeline.at(0)?.date ?? "",
          unit.timeline.at(-1)?.date ?? "",
          String(unit.timeline.length),
          String(unit.inputRows),
          String(unit.outputRows),
          String(unit.rowCount),
          String(unit.cycles),
        ].map(csvCell).join(","),
      ),
    ];
    downloadCsv(lines, "repeat-units-summary.csv");
  };

  const downloadBothCsvs = () => {
    downloadSummaryCsv();
    downloadDetailedCsv();
    finishExport();
  };

  return (
    <section className="mb-10">
      <SectionHeading>Repeat repairs</SectionHeading>
      <p className="-mt-1 mb-4 max-w-2xl text-xs leading-5 text-muted-foreground">
        Tracked by material + serial number; masked serials (XXXX… / N/A) are
        excluded. One cycle = one Repaire_Input entry.
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Tracked Units"
          value={analysis.trackedUnits.toLocaleString()}
          accent="blue"
          icon={Boxes}
        />
        <MetricCard
          label="Repeat Units"
          value={analysis.repeatUnits.toLocaleString()}
          sub={`${analysis.repeatSharePct.toFixed(1)}% of tracked`}
          accent="amber"
          icon={Repeat}
        />
        <MetricCard
          label="Most Cycles"
          value={analysis.maxCycles > 0 ? `${analysis.maxCycles}×` : "—"}
          accent="violet"
          icon={History}
        />
      </div>

      {analysis.repeatUnits > 0 ? (
        <div className="space-y-4">
          <ChartCard
            title={`Repeat units by ${breakdown}`}
            subtitle={selectedLabel ? `Table filtered to ${selectedLabel}. Select the active bar again to show all units.` : `Select a ${breakdown} bar to filter the detailed unit table below.`}
            height={Math.max(260, chartItems.length * 36 + 50)}
            action={
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="inline-flex rounded-lg border border-input p-0.5" aria-label="Repeat unit breakdown">
                  {(["model", "equipment"] as const).map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-pressed={breakdown === option}
                      className={breakdown === option ? "bg-muted" : undefined}
                      onClick={() => {
                        setBreakdown(option);
                        setSelectedLabel(null);
                        setSelectedUnits(new Set());
                        setChartPage(0);
                        setTablePage(0);
                      }}
                    >
                      By {option}
                    </Button>
                  ))}
                </div>
                {chartPageCount > 1 ? <Pager page={safeChartPage} pageCount={chartPageCount} onPageChange={setChartPage} label={`Repeat ${breakdown} chart pages`} /> : null}
              </div>
            }
          >
            <RankBarChart
              data={chartItems}
              color={paletteColor(9)}
              name="Repeat units"
              selectedLabel={selectedLabel ?? undefined}
              onSelect={(label) => {
                setSelectedLabel((current) => current === label ? null : label);
                setSelectedUnits(new Set());
                setTablePage(0);
              }}
            />
          </ChartCard>

          <Card className="gap-3 rounded-xl px-5 py-5 shadow-xs ring-0 sm:px-6">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 px-0">
              <CardTitle className="text-[14px] font-semibold tracking-[-0.01em]">
                {selectedLabel ? `Repeat units for ${selectedLabel}` : "Units with the most repair cycles"}
              </CardTitle>
              {!selectingForExport ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectingForExport(true)}>
                  <Download data-icon="inline-start" />
                  Export
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
                    {allFilteredSelected ? "Clear all" : "Select all"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectingForExport(false); setSelectedUnits(new Set()); }}>
                    Cancel
                  </Button>
                  <Button type="button" size="sm" disabled={selectedUnits.size === 0} onClick={downloadBothCsvs}>
                    <Download data-icon="inline-start" />
                    Export both ({selectedUnits.size})
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectingForExport ? <TableHead className="w-10"><span className="sr-only">Select for export</span></TableHead> : null}
                    <TableHead>Serial</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Equipment group</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="w-1 whitespace-nowrap">Timeline</TableHead>
                    <TableHead className="text-right">Input rows</TableHead>
                    <TableHead className="text-right">Output rows</TableHead>
                    <TableHead className="text-right">All rows</TableHead>
                    <TableHead className="text-right">Cycles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleUnits.map((unit) => (
                    <TableRow
                      key={`${unit.material}|${unit.serial}`}
                      tabIndex={selectingForExport || onSelectUnit ? 0 : undefined}
                      className={`${selectingForExport || onSelectUnit ? "cursor-pointer" : ""} ${selectedUnits.has(unitKey(unit)) ? "bg-primary/8 hover:bg-primary/12" : ""}`}
                      onClick={() => selectingForExport ? toggleUnit(unit) : onSelectUnit?.(unit)}
                      onKeyDown={(event) => {
                        if ((selectingForExport || onSelectUnit) && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          if (selectingForExport) toggleUnit(unit);
                          else onSelectUnit?.(unit);
                        }
                      }}
                    >
                      {selectingForExport ? (
                        <TableCell className="w-10" onClick={(event) => event.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedUnits.has(unitKey(unit))}
                            onChange={() => toggleUnit(unit)}
                            aria-label={`Select ${unit.serial} for export`}
                            className="size-4 accent-primary"
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="font-mono text-xs">
                        {unit.serial}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {unit.material || "—"}
                      </TableCell>
                      <TableCell className={`max-w-40 truncate font-medium ${breakdown === "model" && selectedLabel === (unit.model || "Unknown model") ? "bg-primary/8 text-primary" : ""}`} title={unit.model}>
                        {unit.model || "—"}
                      </TableCell>
                      <TableCell className={breakdown === "equipment" && selectedLabel === (unit.group || "Unknown equipment") ? "bg-primary/8 font-medium text-primary" : ""}>{unit.group || "—"}</TableCell>
                      <TableCell>{unit.equipment || "—"}</TableCell>
                      <TableCell>{unit.company || "—"}</TableCell>
                      <TableCell className="w-1 whitespace-nowrap">
                        <Button type="button" variant="outline" size="sm" onClick={(event) => { event.stopPropagation(); setTimelineUnit(unit); }} disabled={unit.timeline.length === 0}>
                          View
                        </Button>
                        <span className="ml-2 text-[10px] tabular-nums text-muted-foreground">{unit.timeline.length} events</span>
                      </TableCell>
                      <TableCell className={`min-w-32 text-right font-semibold tabular-nums ${unit.inputRows + unit.carryoverInputs === unit.outputRows ? "text-success" : unit.outputRows > unit.inputRows + unit.carryoverInputs || unit.inputRows + unit.carryoverInputs - unit.outputRows > 1 ? "text-destructive" : "text-warning"}`}>
                        <span className="block">{unit.inputRows}</span>
                        {unit.carryoverInputs ? <span className="mt-0.5 block whitespace-nowrap text-[10px] leading-none text-warning">+{unit.carryoverInputs} carryover</span> : null}
                      </TableCell>
                      <TableCell className={`text-right font-semibold tabular-nums ${unit.inputRows + unit.carryoverInputs === unit.outputRows ? "text-success" : unit.outputRows > unit.inputRows + unit.carryoverInputs || unit.inputRows + unit.carryoverInputs - unit.outputRows > 1 ? "text-destructive" : "text-warning"}`}>{unit.outputRows}</TableCell>
                      <TableCell className="text-right tabular-nums">{unit.rowCount}</TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex min-w-10 justify-center rounded-full px-2.5 py-1 font-mono text-xs font-bold ${unit.cycles >= 4 ? "bg-destructive/10 text-destructive" : unit.cycles === 3 ? "bg-orange-500/10 text-orange-700 dark:text-orange-400" : "bg-warning/10 text-warning"}`}>
                          {unit.cycles}×
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">Showing {tableUnits.length === 0 ? 0 : safeTablePage * PAGE_SIZE + 1}–{Math.min((safeTablePage + 1) * PAGE_SIZE, tableUnits.length)} of {tableUnits.length.toLocaleString()} repeat units.</p>
                {tablePageCount > 1 ? <Pager page={safeTablePage} pageCount={tablePageCount} onPageChange={setTablePage} label="Repeat unit table pages" /> : null}
              </div>
            </CardContent>
          </Card>

          <Dialog open={timelineUnit !== null} onOpenChange={(open) => { if (!open) setTimelineUnit(null); }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Repair history · {timelineUnit?.serial}</DialogTitle>
                <DialogDescription>{timelineUnit?.model || "Unknown model"} · {timelineUnit?.material || "Unknown material"} · complete lifecycle history across reporting years.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[65vh] overflow-y-auto pr-2">
                <ol className="relative ml-2 border-l border-border pl-5">
                  {timelineUnit?.timeline.map((event, index) => {
                    const color = statusColor(event.status, index);
                    return <li key={`${event.timestamp}-${index}`} className="relative pb-5 last:pb-0">
                      <span className="absolute -left-[1.57rem] top-1 size-3 rounded-full border-2 border-background" style={{ backgroundColor: color }} />
                      <p className="text-xs text-muted-foreground">{formatDisplayDate(event.date)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ color, borderColor: `color-mix(in oklch, ${color} 35%, transparent)`, backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)` }}>{event.status}</span>
                        <span className="text-xs font-medium">{event.stage === "INPUT" ? "Repair input" : "Repair output"}</span>
                      </div>
                    </li>;
                  })}
                </ol>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No repeat repairs detected among trackable units.
        </p>
      )}
    </section>
  );
}
