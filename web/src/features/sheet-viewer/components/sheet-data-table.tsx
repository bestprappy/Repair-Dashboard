"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { SheetData } from "@/lib/google-sheet/fetch-sheet";

const INITIAL_ROWS = 100;
const ROWS_STEP = 500;

/**
 * Renders every column of the sheet with incremental row reveal so tabs with
 * tens of thousands of rows don't lock up the browser.
 */
export function SheetDataTable({ data }: { data: SheetData }) {
  const [visibleRows, setVisibleRows] = useState(INITIAL_ROWS);

  const { header, rows, columnCount } = data;
  const shown = Math.min(visibleRows, rows.length);
  const columns = Array.from({ length: columnCount }, (_, i) => header[i] ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{rows.length.toLocaleString()} rows</Badge>
        <Badge variant="secondary">{columnCount} columns</Badge>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-muted-foreground">#</TableHead>
              {columns.map((name, index) => (
                <TableHead key={index}>
                  {name || (
                    <span className="text-muted-foreground">
                      Column {index + 1}
                    </span>
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, shown).map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell className="text-muted-foreground">
                  {rowIndex + 1}
                </TableCell>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>{row[colIndex] ?? ""}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Showing {shown.toLocaleString()} of {rows.length.toLocaleString()}{" "}
          rows
        </p>
        {shown < rows.length ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleRows((count) => count + ROWS_STEP)}
            >
              Show {ROWS_STEP} more
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setVisibleRows(rows.length)}
            >
              Show all (may be slow)
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
