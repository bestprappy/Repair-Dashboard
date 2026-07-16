"use client";

import { useCallback, useRef, useState } from "react";

import { useSetAtom } from "jotai";
import { Columns3, FileCheck2, ShieldCheck, UploadCloud, Zap } from "lucide-react";
import Papa from "papaparse";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { LIVE_SHEET_REF } from "../lib/live-sheet";
import type { CsvRow } from "../lib/types";
import {
  csvFieldsAtom,
  dataSourceAtom,
  guessMapping,
  mappingAtom,
  rawRowsAtom,
  stageAtom,
} from "../state/atoms";

/** Manual data-source screen: drag-and-drop or choose a repair CSV. */
export function UploadCard() {
  const setRows = useSetAtom(rawRowsAtom);
  const setFields = useSetAtom(csvFieldsAtom);
  const setMapping = useSetAtom(mappingAtom);
  const setStage = useSetAtom(stageAtom);
  const setSource = useSetAtom(dataSourceAtom);

  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      setError(null);
      Papa.parse<CsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const fields = result.meta.fields ?? [];
          if (fields.length === 0 || result.data.length === 0) {
            setError("No rows found. Check that the file is a valid CSV with headers.");
            return;
          }
          setRows(result.data);
          setFields(fields);
          setMapping(guessMapping(fields));
          setStage("map");
        },
        error: (err) => {
          console.error("[UploadCard] CSV parse failed", err);
          setError("Could not read that file. Please try another CSV.");
        },
      });
    },
    [setRows, setFields, setMapping, setStage],
  );

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <p className="mb-3 text-xs font-semibold text-primary">Repair analytics workspace</p>
          <h1 className="max-w-lg font-heading text-3xl font-semibold leading-tight tracking-[-0.04em] sm:text-4xl">
            Turn repair records into an operational view.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-[15px]">
            Upload the same repair export your team already uses. The dashboard maps your columns, preserves the source values, and builds the views locally in your browser.
          </p>

          <div className="mt-7 space-y-4">
            <Feature
              icon={FileCheck2}
              title="Your existing CSV"
              description="No example data or template values are inserted."
            />
            <Feature
              icon={Columns3}
              title="Review before building"
              description="Confirm required and optional column matches first."
            />
            <Feature
              icon={ShieldCheck}
              title="Private browser processing"
              description="Manual uploads are parsed directly in this app."
            />
          </div>
        </div>

        <Card className="relative gap-0 overflow-hidden rounded-2xl p-5 shadow-xl ring-0 sm:p-7">
          <span className="absolute inset-x-0 top-0 h-1 brand-gradient" />
          <div className="mb-5 flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UploadCloud className="size-5" />
            </span>
            <div>
              <h2 className="font-heading text-lg font-semibold">Upload repair data</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Choose a CSV with a header row. You can review its field mapping next.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              parseFile(event.dataTransfer.files[0]);
            }}
            className={cn(
              "group flex min-h-52 w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 py-8 text-center transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              dragging
                ? "border-primary bg-primary/8"
                : "border-border bg-muted/35 hover:border-primary/40 hover:bg-primary/[0.035]",
            )}
          >
            <span className="mb-4 flex size-12 items-center justify-center rounded-full border bg-card text-primary shadow-sm transition-transform group-hover:-translate-y-0.5">
              <UploadCloud className="size-5" />
            </span>
            <span className="text-sm font-semibold text-foreground">Choose a CSV file</span>
            <span className="mt-1.5 text-xs text-muted-foreground">
              or drag and drop it here
            </span>
          </button>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => parseFile(event.target.files?.[0])}
          />

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2.5 text-left text-xs leading-5 text-destructive"
            >
              {error}
            </p>
          ) : null}

          {LIVE_SHEET_REF ? (
            <div className="mt-5 flex items-center justify-between gap-4 border-t pt-5">
              <div className="min-w-0">
                <p className="text-xs font-semibold">Live sheet is available</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  Return to the connected Google Sheet source
                </p>
              </div>
              <Button type="button" variant="outline" onClick={() => setSource("live")}>
                <Zap data-icon="inline-start" />
                Use live data
              </Button>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof FileCheck2;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card text-primary shadow-xs">
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
