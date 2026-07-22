"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { ArrowLeft, ArrowRight, CheckCircle2, Database, Rows3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { buildDataset } from "../lib/transform";
import type { ColumnMapping } from "../lib/types";
import {
  csvFieldsAtom,
  datasetAtom,
  mappingAtom,
  rawRowsAtom,
  stageAtom,
  viewAtom,
} from "../state/atoms";

const SKIP = "__skip__";

const FIELDS: { key: keyof ColumnMapping; label: string; optional?: boolean }[] = [
  { key: "company", label: "Company" },
  { key: "status", label: "Status" },
  { key: "group", label: "Equipment group" },
  { key: "ym", label: "Year and month" },
  { key: "amount", label: "Repair amount" },
  { key: "equipment", label: "Equipment", optional: true },
  { key: "model", label: "Model", optional: true },
  { key: "tabSheet", label: "Workflow stage", optional: true },
  { key: "cause", label: "Cause", optional: true },
  { key: "subCause", label: "Sub cause", optional: true },
  { key: "serial", label: "Serial number", optional: true },
  { key: "material", label: "Material", optional: true },
  { key: "ticket", label: "Repair ticket (TR No.)", optional: true },
  { key: "date", label: "Lifecycle date", optional: true },
];

const REQUIRED_FIELDS = FIELDS.filter((field) => !field.optional).map(
  (field) => field.key,
);

/** Match imported CSV columns to dashboard fields before aggregation. */
export function ColumnMapper() {
  const fields = useAtomValue(csvFieldsAtom);
  const rows = useAtomValue(rawRowsAtom);
  const [mapping, setMapping] = useAtom(mappingAtom);
  const setDataset = useSetAtom(datasetAtom);
  const setStage = useSetAtom(stageAtom);
  const setView = useSetAtom(viewAtom);

  const ready = REQUIRED_FIELDS.every((key) => Boolean(mapping[key]));

  const update = (key: keyof ColumnMapping, value: string | null) => {
    setMapping((prev) => ({ ...prev, [key]: !value || value === SKIP ? "" : value }));
  };

  const build = () => {
    if (!ready) return;
    setStage("loading");
    setTimeout(() => {
      try {
        setDataset(buildDataset(rows, mapping));
        setView("all");
        setStage("dash");
      } catch (err) {
        console.error("[ColumnMapper] buildDataset failed", err);
        setStage("map");
      }
    }, 60);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[280px_1fr] lg:gap-7">
        <aside>
          <p className="text-xs font-semibold text-primary">Import setup · Step 2 of 2</p>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
            Review column mapping
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            We matched familiar headers automatically. Confirm the required fields and add optional detail for deeper analysis.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-1">
            <DataStat icon={Rows3} value={rows.length.toLocaleString()} label="Rows found" />
            <DataStat icon={Database} value={fields.length.toLocaleString()} label="Columns found" />
          </div>

          <div className="mt-5 rounded-xl border bg-card p-4 text-xs leading-5 text-muted-foreground shadow-xs">
            <div className="mb-2 flex items-center gap-2 font-semibold text-foreground">
              <CheckCircle2 className="size-4 text-success" />
              Required for dashboard
            </div>
            Company, status, equipment group, month, and repair amount must be mapped before building.
          </div>
        </aside>

        <Card className="gap-0 rounded-2xl p-5 shadow-lg ring-0 sm:p-7">
          <div className="mb-6 flex flex-col gap-2 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-lg font-semibold">Dashboard fields</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Required fields appear first; optional fields unlock model, cause, and repeat-repair views.
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {REQUIRED_FIELDS.filter((key) => mapping[key]).length}/{REQUIRED_FIELDS.length} required
            </span>
          </div>

          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className="flex min-w-0 flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  {field.label}
                  <span className="text-[10px] font-normal text-muted-foreground">
                    {field.optional ? "Optional" : "Required"}
                  </span>
                </label>
                <Select
                  value={mapping[field.key] || (field.optional ? SKIP : "")}
                  onValueChange={(value) => update(field.key, value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select source column" />
                  </SelectTrigger>
                  <SelectContent>
                    {field.optional ? (
                      <SelectItem value={SKIP}>Skip this field</SelectItem>
                    ) : null}
                    {fields.map((column) => (
                      <SelectItem key={column} value={column}>
                        {column}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setStage("upload")}>
              <ArrowLeft data-icon="inline-start" />
              Choose another file
            </Button>
            <Button type="button" size="lg" onClick={build} disabled={!ready}>
              Build dashboard
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DataStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Rows3;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3.5 shadow-xs">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 font-heading text-lg font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
