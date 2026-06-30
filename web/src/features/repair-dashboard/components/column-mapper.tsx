"use client";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  { key: "company", label: "Company *" },
  { key: "status", label: "Status *" },
  { key: "group", label: "Group Equipment *" },
  { key: "ym", label: "Year-Month *" },
  { key: "amount", label: "Amount *" },
  { key: "equipment", label: "Equipment (optional)", optional: true },
];

/** Second screen: match CSV columns to dashboard fields, then build. */
export function ColumnMapper() {
  const fields = useAtomValue(csvFieldsAtom);
  const rows = useAtomValue(rawRowsAtom);
  const [mapping, setMapping] = useAtom(mappingAtom);
  const setDataset = useSetAtom(datasetAtom);
  const setStage = useSetAtom(stageAtom);
  const setView = useSetAtom(viewAtom);

  const update = (key: keyof ColumnMapping, value: string | null) => {
    setMapping((prev) => ({ ...prev, [key]: !value || value === SKIP ? "" : value }));
  };

  const build = () => {
    setStage("loading");
    // Defer the heavy aggregation so the loading state can paint first.
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
    <div className="flex min-h-[calc(100vh-62px)] items-center justify-center px-6 py-10">
      <Card className="w-full max-w-xl gap-0 px-10 py-9">
        <h2 className="font-heading text-xl font-bold">Map Columns</h2>
        <p className="mb-6 mt-1.5 text-sm text-muted-foreground">
          Match your CSV columns to the required fields
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {field.label}
              </label>
              <Select
                value={mapping[field.key] || (field.optional ? SKIP : "")}
                onValueChange={(value) => update(field.key, value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {field.optional ? (
                    <SelectItem value={SKIP}>— skip —</SelectItem>
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

        <button
          type="button"
          onClick={build}
          className={cn(
            "mt-6 w-full rounded-lg bg-linear-to-br from-[#4f8ef7] to-[#7c5cfc] px-6 py-2.5",
            "text-sm font-semibold text-white transition-opacity hover:opacity-90",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          Build Dashboard →
        </button>
      </Card>
    </div>
  );
}
