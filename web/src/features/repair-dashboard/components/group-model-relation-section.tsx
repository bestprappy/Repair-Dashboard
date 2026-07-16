"use client";

import { useMemo, useState } from "react";

import { Boxes, FileStack, Wrench } from "lucide-react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import { MetricCard } from "@/components/metric-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { RankBarChart } from "./charts";
import { selectGroupModelRelations } from "../lib/insights";
import { formatCurrency, paletteColor } from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";

interface GroupModelRelationSectionProps {
  rows: CsvRow[];
  mapping: ColumnMapping;
}

/** Select an equipment group and inspect its ten most common model values. */
export function GroupModelRelationSection({
  rows,
  mapping,
}: GroupModelRelationSectionProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const relations = useMemo(
    () => selectGroupModelRelations(rows, mapping),
    [rows, mapping],
  );

  if (!mapping.group || !mapping.model || relations.length === 0) return null;

  const active =
    relations.find((relation) => relation.group === selectedGroup) ??
    relations[0];
  const leadModel = active.topModels[0];
  const chartData = active.topModels.map((model) => ({
    label: model.model,
    count: model.count,
  }));

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionHeading>Equipment group → model relationship</SectionHeading>
          <p className="-mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Select one equipment group to see its ten most frequent model values
            and how those records relate to companies, outcomes, and reported
            repair amount.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <label
            htmlFor="equipment-group-select"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Equipment group
          </label>
          <Select
            value={active.group}
            onValueChange={(value) => {
              if (value) setSelectedGroup(value);
            }}
          >
            <SelectTrigger id="equipment-group-select" className="w-full">
              <SelectValue>{active.group}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="max-w-[calc(100vw-2rem)]">
              {relations.map((relation) => (
                <SelectItem key={relation.group} value={relation.group}>
                  <span className="max-w-64 truncate">{relation.group}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {relation.totalRecords.toLocaleString()}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Repair records in group"
          value={active.totalRecords.toLocaleString()}
          sub={active.group}
          accent="blue"
          icon={FileStack}
          featured
        />
        <MetricCard
          label="Distinct repaired models"
          value={active.distinctModels.toLocaleString()}
          sub="Models with at least one record"
          accent="violet"
          icon={Boxes}
        />
        <MetricCard
          label="Top repaired model"
          value={leadModel.model}
          sub={`${leadModel.count.toLocaleString()} records · ${leadModel.sharePct.toFixed(1)}% share`}
          accent="teal"
          icon={Wrench}
          compactValue
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <ChartCard
          title={`Top 10 of ${active.distinctModels.toLocaleString()} models in ${active.group}`}
          subtitle="Ranked by repair-record count. The chart uses only rows where Model is populated."
          height={Math.max(340, chartData.length * 42 + 40)}
        >
          <RankBarChart
            data={chartData}
            color={paletteColor(0)}
            name="Repair records"
          />
        </ChartCard>

        <Card className="gap-4 rounded-xl border border-border/80 py-5 shadow-xs">
          <CardHeader className="px-5 sm:px-6">
            <CardTitle className="text-[14px] font-semibold tracking-[-0.01em]">
              Model relationship detail
            </CardTitle>
            <CardDescription className="text-xs leading-5">
              Share is calculated from the {active.modelMappedRecords.toLocaleString()} records in this group that include a model. Completed PASS is PASS ÷ (PASS + NOT PASS).
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/35 hover:bg-muted/35">
                  <TableHead className="pl-5 sm:pl-6">Model</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead className="text-right">Serviced by</TableHead>
                  <TableHead className="pr-5 text-right sm:pr-6">
                    Completed PASS
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.topModels.map((model, index) => (
                  <TableRow key={model.model}>
                    <TableCell className="max-w-64 pl-5 font-medium sm:pl-6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/8 text-[10px] font-semibold tabular-nums text-primary">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate" title={model.model}>
                            {model.model}
                          </p>
                          <p className="mt-0.5 text-[10px] font-normal tabular-nums text-muted-foreground">
                            {model.pricedRecords > 0
                              ? `${formatCurrency(model.reportedAmount)} reported`
                              : "No repair amount reported"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {model.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {model.sharePct.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {model.companies.length > 0 ? (
                        <div className="ml-auto flex max-w-44 flex-wrap justify-end gap-1">
                          {model.companies.map((company) => (
                            <span
                              key={company.company}
                              title={`${company.count.toLocaleString()} repair records`}
                              className="rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                            >
                              {company.company}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right sm:pr-6">
                      <span className="font-medium tabular-nums">
                        {model.passRate == null
                          ? "—"
                          : `${model.passRate.toFixed(1)}%`}
                      </span>
                      <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                        ({model.completedRecords.toLocaleString()})
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
