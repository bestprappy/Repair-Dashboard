"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";

import { SectionHeading } from "@/components/chart-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

import { formatDisplayDate, readColumn, statusColor } from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";

const ALL = "__all__";
const PAGE_SIZE = 50;

function lifecycleTime(value: string): number {
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (match) {
    const year = Number(match[3]) < 100 ? 2000 + Number(match[3]) : Number(match[3]);
    return new Date(year, Number(match[2]) - 1, Number(match[1])).getTime();
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

interface DataExplorerSectionProps {
  rows: CsvRow[];
  historyRows?: CsvRow[];
  fields: string[];
  mapping: ColumnMapping;
  focusedUnit?: { serial: string; material: string } | null;
  onClearFocusedUnit?: () => void;
}

function distinctValues(
  rows: CsvRow[],
  column: string | undefined,
  normalize: (value: string) => string = (value) => value,
): string[] {
  if (!column) return [];
  const values = new Set<string>();
  for (const row of rows) {
    const value = normalize(readColumn(row, column));
    if (value) values.add(value);
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

/** Filterable, searchable, paginated table over every analyzed row. */
export function DataExplorerSection({
  rows,
  historyRows = rows,
  fields,
  mapping,
  focusedUnit = null,
  onClearFocusedUnit,
}: DataExplorerSectionProps) {
  const [company, setCompany] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [group, setGroup] = useState(ALL);
  const [month, setMonth] = useState(ALL);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const deferredSearch = useDeferredValue(search);

  const companyOptions = useMemo(
    () => distinctValues(rows, mapping.company),
    [rows, mapping.company],
  );
  const statusOptions = useMemo(
    () => distinctValues(rows, mapping.status, (v) => v.toUpperCase()),
    [rows, mapping.status],
  );
  const groupOptions = useMemo(
    () => distinctValues(rows, mapping.group),
    [rows, mapping.group],
  );
  const monthOptions = useMemo(
    () => distinctValues(rows, mapping.ym),
    [rows, mapping.ym],
  );

  const filtered = useMemo(() => {
    if (focusedUnit) {
      return historyRows
        .filter((row) => readColumn(row, mapping.serial) === focusedUnit.serial && readColumn(row, mapping.material) === focusedUnit.material)
        .sort((a, b) => lifecycleTime(readColumn(a, mapping.date)) - lifecycleTime(readColumn(b, mapping.date)));
    }
    const needle = deferredSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (company !== ALL && readColumn(row, mapping.company) !== company) {
        return false;
      }
      if (
        status !== ALL &&
        readColumn(row, mapping.status).toUpperCase() !== status
      ) {
        return false;
      }
      if (group !== ALL && readColumn(row, mapping.group) !== group) {
        return false;
      }
      if (month !== ALL && readColumn(row, mapping.ym) !== month) {
        return false;
      }
      if (!needle) return true;
      return fields.some((field) =>
        (row[field] ?? "").toLowerCase().includes(needle),
      );
    });
  }, [rows, historyRows, fields, mapping, company, status, group, month, deferredSearch, focusedUnit]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  );
  const firstRow = filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const lastRow = Math.min(filtered.length, (safePage + 1) * PAGE_SIZE);

  const applyFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(0);
  };

  const filterSelect = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: string[],
  ) =>
    options.length > 0 ? (
      <Select value={value} onValueChange={(next) => onChange(next ?? ALL)}>
        <SelectTrigger className="w-full sm:w-44" aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All {label.toLowerCase()}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : null;

  return (
    <section className="mb-10">
      <SectionHeading>Repair record explorer</SectionHeading>

      <Card className="gap-5 rounded-xl px-4 py-4 shadow-xs ring-0 sm:px-5 sm:py-5">
        {focusedUnit ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            <p className="text-xs"><span className="font-semibold text-primary">Repeat-unit timeline:</span> <span className="font-mono">{focusedUnit.serial}</span> · {focusedUnit.material || "Unknown material"}</p>
            <Button type="button" variant="ghost" size="sm" onClick={onClearFocusedUnit}>Show all records</Button>
          </div>
        ) : null}
        {!focusedUnit ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {filterSelect("Companies", company, applyFilter(setCompany), companyOptions)}
          {filterSelect("Statuses", status, applyFilter(setStatus), statusOptions)}
          {filterSelect("Groups", group, applyFilter(setGroup), groupOptions)}
          {filterSelect("Months", month, applyFilter(setMonth), monthOptions)}
          <div className="relative min-w-48 flex-1">
            <label htmlFor="explorer-search" className="sr-only">
              Search all columns
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="explorer-search"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search all columns…"
              className="pl-9"
            />
          </div>
        </div> : null}

        <div className="max-h-[34rem] overflow-y-auto rounded-lg border bg-card">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
              <TableRow className="bg-muted/50">
                {fields.map((field, index) => (
                  <TableHead key={index}>
                    {field || (
                      <span className="text-muted-foreground">
                        Column {index + 1}
                      </span>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={fields.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No records match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row, rowIndex) => (
                  <TableRow key={safePage * PAGE_SIZE + rowIndex}>
                    {fields.map((field, colIndex) => {
                      const raw = row[field] ?? "";
                      const isStatus = field === mapping.status;
                      const isStage = field === mapping.tabSheet;
                      const isDate = field === mapping.date;
                      const isSelectedIdentifier = Boolean(focusedUnit) && (field === mapping.serial || field === mapping.material);
                      if (isStatus && raw.trim()) {
                        const label = raw.trim().toUpperCase();
                        const color = statusColor(label, colIndex);
                        return <TableCell key={colIndex} className="max-w-64" title={raw}><span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold" style={{ color, borderColor: `color-mix(in oklch, ${color} 35%, transparent)`, backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)` }}>{label}</span></TableCell>;
                      }
                      if (isStage && raw.trim()) {
                        const output = /output/i.test(raw);
                        const input = /input/i.test(raw);
                        return <TableCell key={colIndex} className="max-w-64" title={raw}><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${output ? "border-success/30 bg-success/10 text-success" : input ? "border-warning/30 bg-warning/10 text-warning" : "border-border bg-muted text-muted-foreground"}`}>{output ? "OUTPUT" : input ? "INPUT" : raw}</span></TableCell>;
                      }
                      return (
                        <TableCell
                          key={colIndex}
                          className={`max-w-64 truncate ${isSelectedIdentifier ? "bg-primary/8 font-medium text-primary" : ""} ${isDate && (!raw.trim() || lifecycleTime(raw) === Number.MAX_SAFE_INTEGER) ? "bg-destructive/8 font-medium text-destructive" : ""}`}
                          title={raw}
                        >
                          {isDate && raw ? formatDisplayDate(raw) : raw || (isDate ? "Missing date" : "")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {filtered.length === 0
              ? "0 records"
              : `${firstRow.toLocaleString()}–${lastRow.toLocaleString()} of ${filtered.length.toLocaleString()} records`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft data-icon="inline-start" />
              Prev
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              Page {safePage + 1} / {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              aria-label="Next page"
            >
              Next
              <ChevronRight data-icon="inline-end" />
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
