"use client";

import { useMemo, useState } from "react";

import { Boxes, History, Repeat } from "lucide-react";

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
import { formatDisplayDate, paletteColor, statusColor } from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";

interface RepeatRepairsSectionProps {
  rows: CsvRow[];
  historyRows?: CsvRow[];
  mapping: ColumnMapping;
  onSelectUnit?: (unit: RepeatUnit) => void;
}

const PAGE_SIZE = 10;

/** Units that entered repair more than once: summary, by model, worst list. */
export function RepeatRepairsSection({ rows, historyRows = rows, mapping, onSelectUnit }: RepeatRepairsSectionProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [chartPage, setChartPage] = useState(0);
  const [tablePage, setTablePage] = useState(0);
  const [timelineUnit, setTimelineUnit] = useState<RepeatUnit | null>(null);
  const analysis = useMemo(
    () => selectRepeatRepairs(rows, mapping, historyRows),
    [rows, mapping, historyRows],
  );

  if (!analysis) return null;

  const chartPageCount = Math.max(1, Math.ceil(analysis.byModel.length / PAGE_SIZE));
  const safeChartPage = Math.min(chartPage, chartPageCount - 1);
  const chartModels = analysis.byModel.slice(safeChartPage * PAGE_SIZE, (safeChartPage + 1) * PAGE_SIZE);
  const tableUnits = selectedModel
    ? analysis.topUnits.filter((unit) => (unit.model || "Unknown model") === selectedModel)
    : analysis.topUnits;
  const tablePageCount = Math.max(1, Math.ceil(tableUnits.length / PAGE_SIZE));
  const safeTablePage = Math.min(tablePage, tablePageCount - 1);
  const visibleUnits = tableUnits.slice(safeTablePage * PAGE_SIZE, (safeTablePage + 1) * PAGE_SIZE);

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
            title="Repeat units by model"
            subtitle={selectedModel ? `Table filtered to ${selectedModel}. Select the active bar again to show all units.` : "Select a model bar to filter the detailed unit table below."}
            height={Math.max(260, chartModels.length * 36 + 50)}
            action={chartPageCount > 1 ? <Pager page={safeChartPage} pageCount={chartPageCount} onPageChange={setChartPage} label="Repeat model chart pages" /> : null}
          >
            <RankBarChart
              data={chartModels}
              color={paletteColor(9)}
              name="Repeat units"
              selectedLabel={selectedModel ?? undefined}
              onSelect={(model) => {
                setSelectedModel((current) => current === model ? null : model);
                setTablePage(0);
              }}
            />
          </ChartCard>

          <Card className="gap-3 rounded-xl px-5 py-5 shadow-xs ring-0 sm:px-6">
            <CardHeader className="px-0">
              <CardTitle className="text-[14px] font-semibold tracking-[-0.01em]">
                {selectedModel ? `Repeat units for ${selectedModel}` : "Units with the most repair cycles"}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
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
                      tabIndex={onSelectUnit ? 0 : undefined}
                      className={onSelectUnit ? "cursor-pointer" : undefined}
                      onClick={() => onSelectUnit?.(unit)}
                      onKeyDown={(event) => {
                        if (onSelectUnit && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          onSelectUnit(unit);
                        }
                      }}
                    >
                      <TableCell className="font-mono text-xs">
                        {unit.serial}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {unit.material || "—"}
                      </TableCell>
                      <TableCell className={`max-w-40 truncate font-medium ${selectedModel === (unit.model || "Unknown model") ? "bg-primary/8 text-primary" : ""}`} title={unit.model}>
                        {unit.model || "—"}
                      </TableCell>
                      <TableCell>{unit.group || "—"}</TableCell>
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
