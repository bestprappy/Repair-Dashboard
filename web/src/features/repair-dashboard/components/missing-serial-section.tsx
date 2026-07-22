"use client";

import { useMemo, useState } from "react";

import { AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

import { SectionHeading } from "@/components/chart-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  formatDisplayDate,
  invalidSerialReason,
  readColumn,
} from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";

const TABLE_LIMIT = 100;

interface MissingSerialSectionProps {
  rows: CsvRow[];
  mapping: ColumnMapping;
}

/** Auditable data-quality view for rows excluded because Serial is blank. */
export function MissingSerialSection({ rows, mapping }: MissingSerialSectionProps) {
  const [open, setOpen] = useState(false);
  const [company, setCompany] = useState<string | null>(null);

  const companies = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const name = readColumn(row, mapping.company) || "Unknown company";
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [rows, mapping.company]);

  const visibleRows = useMemo(
    () =>
      (company
        ? rows.filter(
            (row) => (readColumn(row, mapping.company) || "Unknown company") === company,
          )
        : rows
      ).slice(0, TABLE_LIMIT),
    [rows, mapping.company, company],
  );
  const filteredCount = company
    ? companies.find((item) => item.name === company)?.count ?? 0
    : rows.length;
  const maximum = companies[0]?.count ?? 1;

  return (
    <section className="mb-10">
      <SectionHeading>Missing values</SectionHeading>
      <Card className="gap-0 overflow-hidden rounded-xl border border-destructive/30 p-0 shadow-xs ring-0">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Missing or invalid serial numbers</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Excluded from all dashboard calculations; click to inspect the source rows.
            </span>
          </span>
          <span className="font-heading text-2xl font-semibold tabular-nums">
            {rows.length.toLocaleString()}
          </span>
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {open ? (
          <div className="border-t border-border/70 px-5 py-5 sm:px-6">
            {rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No rows with a missing serial number in the selected period.
              </p>
            ) : (
              <>
                <div className="mb-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {companies.map((item) => (
                    <button
                      type="button"
                      key={item.name}
                      onClick={() => {
                        setCompany((current) => (current === item.name ? null : item.name));
                      }}
                      aria-pressed={company === item.name}
                      className="rounded-lg border border-border/80 p-3 text-left transition-colors hover:bg-muted/60 aria-pressed:border-destructive aria-pressed:bg-destructive/10"
                    >
                      <span className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-medium">{item.name}</span>
                        <span className="font-semibold tabular-nums">{item.count}</span>
                      </span>
                      <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-destructive"
                          style={{ width: `${(item.count / maximum) * 100}%` }}
                        />
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {Math.min(filteredCount, TABLE_LIMIT).toLocaleString()} of{" "}
                    {filteredCount.toLocaleString()} rows{company ? ` for ${company}` : ""}
                  </p>
                  {company ? (
                    <Button variant="ghost" size="sm" onClick={() => setCompany(null)}>
                      Show all companies
                    </Button>
                  ) : null}
                </div>

                <div className="overflow-hidden rounded-lg border border-border/80">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>TR No.</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Serial value</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleRows.map((row, index) => (
                        <TableRow key={`${readColumn(row, mapping.ticket)}-${index}`}>
                          <TableCell>{readColumn(row, mapping.company) || "—"}</TableCell>
                          <TableCell>{readColumn(row, mapping.ticket) || "—"}</TableCell>
                          <TableCell>{readColumn(row, mapping.material) || "—"}</TableCell>
                          <TableCell>{readColumn(row, mapping.serial) || "(blank)"}</TableCell>
                          <TableCell>
                            {invalidSerialReason(readColumn(row, mapping.serial)) || "—"}
                          </TableCell>
                          <TableCell>{readColumn(row, mapping.status) || "—"}</TableCell>
                          <TableCell>{readColumn(row, mapping.tabSheet) || "—"}</TableCell>
                          <TableCell>
                            {formatDisplayDate(readColumn(row, mapping.date)) || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        ) : null}
      </Card>
    </section>
  );
}
