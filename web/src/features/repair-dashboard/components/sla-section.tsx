"use client";

import { useMemo, useState } from "react";
import { AlarmClock, CalendarCheck, CircleGauge, Timer } from "lucide-react";

import { SectionHeading } from "@/components/chart-card";
import { MetricCard } from "@/components/metric-card";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { selectSlaAnalysis } from "../lib/sla";
import type { ColumnMapping, CsvRow } from "../lib/types";

export function SlaSection({ rows, mapping }: { rows: CsvRow[]; mapping: ColumnMapping }) {
  const [target, setTarget] = useState(30);
  const analysis = useMemo(() => selectSlaAnalysis(rows, mapping, target), [rows, mapping, target]);

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionHeading>SLA & turnaround</SectionHeading>
          <p className="mt-1 text-sm text-muted-foreground">Input-to-output repair cycles, paired by material and serial number.</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium">
          SLA target
          <Input className="w-20" type="number" min={1} max={365} value={target}
            onChange={(event) => setTarget(Math.max(1, Math.min(365, Number(event.target.value) || 1)))} />
          days
        </label>
      </div>

      {!analysis.available ? (
        <Card className="rounded-xl border-dashed px-6 py-8 text-center shadow-xs ring-0">
          <Timer className="mx-auto size-7 text-muted-foreground" />
          <h3 className="mt-3 font-heading font-semibold">Lifecycle data required</h3>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{analysis.reason}</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Median turnaround" value={analysis.medianDays == null ? "—" : `${analysis.medianDays.toFixed(1)} days`} sub={`${analysis.completed.length.toLocaleString()} completed cycles`} accent="blue" icon={Timer} featured />
            <MetricCard label="SLA compliance" value={analysis.compliancePct == null ? "—" : `${analysis.compliancePct.toFixed(1)}%`} sub={`Completed within ${target} days`} accent="green" icon={CalendarCheck} />
            <MetricCard label="Open repairs" value={analysis.open.length.toLocaleString()} sub={`As of ${analysis.asOf?.toLocaleDateString()}`} accent="violet" icon={CircleGauge} />
            <MetricCard label="Overdue open" value={analysis.overdueOpen.toLocaleString()} sub={`Older than ${target} days`} accent="amber" icon={AlarmClock} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <Card className="gap-4 rounded-xl px-5 py-5 shadow-xs ring-0">
              <h3 className="font-heading font-semibold">Open repair aging</h3>
              <div className="space-y-3">
                {analysis.aging.map((bucket) => {
                  const pct = analysis.open.length ? bucket.count / analysis.open.length * 100 : 0;
                  return <div key={bucket.label}>
                    <div className="mb-1 flex justify-between text-xs"><span>{bucket.label}</span><span className="font-semibold tabular-nums">{bucket.count}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
                  </div>;
                })}
              </div>
            </Card>

            <Card className="gap-3 rounded-xl px-5 py-5 shadow-xs ring-0">
              <h3 className="font-heading font-semibold">Company SLA performance</h3>
              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <Table><TableHeader><TableRow><TableHead>Company</TableHead><TableHead className="text-right">Cycles</TableHead><TableHead className="text-right">Median</TableHead><TableHead className="text-right">Compliance</TableHead></TableRow></TableHeader>
                  <TableBody>{analysis.companies.map((company) => <TableRow key={company.company}><TableCell className="font-medium">{company.company}</TableCell><TableCell className="text-right tabular-nums">{company.completed}</TableCell><TableCell className="text-right tabular-nums">{company.medianDays.toFixed(1)}d</TableCell><TableCell className="text-right font-semibold tabular-nums">{company.compliancePct.toFixed(1)}%</TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
