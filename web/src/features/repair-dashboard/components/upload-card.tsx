"use client";

import { useCallback, useRef, useState } from "react";

import Papa from "papaparse";
import { useSetAtom } from "jotai";
import { UploadCloud } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  csvFieldsAtom,
  guessMapping,
  mappingAtom,
  rawRowsAtom,
  stageAtom,
} from "../state/atoms";
import type { CsvRow } from "../lib/types";

/** First screen: drag-and-drop / pick a repair CSV and parse it. */
export function UploadCard() {
  const setRows = useSetAtom(rawRowsAtom);
  const setFields = useSetAtom(csvFieldsAtom);
  const setMapping = useSetAtom(mappingAtom);
  const setStage = useSetAtom(stageAtom);

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
    <div className="flex min-h-[calc(100vh-62px)] items-center justify-center px-6 py-10">
      <Card className="w-full max-w-lg gap-0 px-10 py-12 text-center">
        <div className="mx-auto mb-6 flex size-18 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
          <UploadCloud className="size-8 text-primary" />
        </div>
        <h2 className="font-heading text-xl font-bold">Load Repair CSV</h2>
        <p className="mx-auto mb-7 mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Drop your repair data file to generate status distributions, group
          breakdowns, and monthly trends.
        </p>

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
            "w-full cursor-pointer rounded-xl border border-dashed bg-muted/50 px-5 py-7 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragging ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <span className="inline-block rounded-lg bg-linear-to-br from-[#4f8ef7] to-[#7c5cfc] px-6 py-2.5 text-sm font-semibold text-white">
            Choose CSV file
          </span>
          <span className="mt-2 block text-xs text-muted-foreground">
            or drag &amp; drop here
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(event) => parseFile(event.target.files?.[0])}
        />

        {error ? (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
