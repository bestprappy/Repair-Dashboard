"use client";

import { useMemo } from "react";

import { Boxes, History, Repeat } from "lucide-react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import { MetricCard } from "@/components/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { paletteColor } from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";

interface RepeatRepairsSectionProps {
  rows: CsvRow[];
  mapping: ColumnMapping;
}

/** Units that entered repair more than once: summary, by model, worst list. */
export function RepeatRepairsSection({ rows, mapping }: RepeatRepairsSectionProps) {
  const analysis = useMemo(
    () => selectRepeatRepairs(rows, mapping),
    [rows, mapping],
  );

  if (!analysis) return null;

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
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard
            title="Repeat units by model"
            height={Math.max(220, analysis.byModel.length * 30 + 50)}
          >
            <RankBarChart
              data={analysis.byModel}
              color={paletteColor(9)}
              name="Repeat units"
            />
          </ChartCard>

          <Card className="gap-3 rounded-xl px-5 py-5 shadow-xs ring-0 sm:px-6">
            <CardHeader className="px-0">
              <CardTitle className="text-[14px] font-semibold tracking-[-0.01em]">
                Units with the most repair cycles
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Cycles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analysis.topUnits.map((unit) => (
                    <TableRow key={`${unit.material}|${unit.serial}`}>
                      <TableCell className="font-mono text-xs">
                        {unit.serial}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {unit.material || "—"}
                      </TableCell>
                      <TableCell className="max-w-40 truncate" title={unit.model}>
                        {unit.model || "—"}
                      </TableCell>
                      <TableCell>{unit.company || "—"}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {unit.cycles}×
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No repeat repairs detected among trackable units.
        </p>
      )}
    </section>
  );
}
