"use client";

import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { ArrowUpDown, Download, Timer } from "lucide-react";

import { ChartCard } from "@/components/chart-card";
import { Pager } from "@/components/pager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { BreakdownPieChart, RankBarChart } from "./charts";
import { selectSlaAnalysis } from "../lib/sla";
import type { SlaCycle } from "../lib/sla";
import { formatDisplayDate, paletteColor, statusColor } from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";
import { endMonthAtom, startMonthAtom } from "../state/atoms";

const TRACEBACK_PAGE_SIZE = 100;
type TraceSortKey = "status" | "company" | "group" | "equipment" | "material" | "model" | "serial" | "input" | "output" | "age";
type SortDirection = "asc" | "desc";
type RepairMode = "ongoing" | "completed";

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function repairStatus(cycle: SlaCycle): { label: string; color: string } {
  if (!cycle.completedAt) {
    return { label: "ONGOING", color: "var(--warning)" };
  }
  const label = (cycle.outputStatus || "COMPLETED").trim().toUpperCase();
  return { label, color: statusColor(label, 0) };
}

/** Local calendar month (YYYY-MM) so window compares ignore time zones. */
function toISOMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Human "Mon YYYY" label for a `YYYY-MM` reporting-window bound. */
function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function SlaSection({ rows, mapping }: { rows: CsvRow[]; mapping: ColumnMapping }) {
  const [target, setTarget] = useState(30);
  const [mode, setMode] = useState<RepairMode>("ongoing");
  const [traceQuery, setTraceQuery] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companyMenuScope, setCompanyMenuScope] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [ageFilter, setAgeFilter] = useState<{ minDays: number; maxDays: number | null; label: string } | null>(null);
  const [companySelectionFromMenu, setCompanySelectionFromMenu] = useState(false);
  const [groupSelectionFromMenu, setGroupSelectionFromMenu] = useState(false);
  const [ageSelectionFromMenu, setAgeSelectionFromMenu] = useState(false);
  const [tracePage, setTracePage] = useState(0);
  const [traceSort, setTraceSort] = useState<TraceSortKey>("age");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const startMonth = useAtomValue(startMonthAtom);
  const endMonth = useAtomValue(endMonthAtom);
  const analysis = useMemo(() => selectSlaAnalysis(rows, mapping, target), [rows, mapping, target]);
  const isCompleted = mode === "completed";
  const openInRange = useMemo(
    () => analysis.open.filter((cycle) => {
      const month = toISOMonth(cycle.receivedAt);
      return month >= startMonth && month <= endMonth;
    }),
    [analysis.open, startMonth, endMonth],
  );
  const completedInRange = useMemo(
    () => analysis.completed.filter((cycle) => {
      if (!cycle.completedAt) return false;
      const month = toISOMonth(cycle.completedAt);
      return month >= startMonth && month <= endMonth;
    }),
    [analysis.completed, startMonth, endMonth],
  );
  const durationBuckets = useMemo(() => {
    const definitions = isCompleted
      ? [
          { label: "Within 1 month", minDays: -1, maxDays: 30 },
          { label: "Within 1–3 months", minDays: 30, maxDays: 90 },
          { label: "Within 3–6 months", minDays: 90, maxDays: 180 },
          { label: "Within 6–9 months", minDays: 180, maxDays: 270 },
          { label: "Within 9–12 months", minDays: 270, maxDays: 365 },
          { label: "After 1 year", minDays: 365, maxDays: null },
        ]
      : [
          { label: "More than 1 month", minDays: 30, maxDays: null },
          { label: "More than 3 months", minDays: 90, maxDays: null },
          { label: "More than 6 months", minDays: 180, maxDays: null },
          { label: "More than 9 months", minDays: 270, maxDays: null },
          { label: "More than 1 year", minDays: 365, maxDays: null },
        ];
    const cycles = (isCompleted ? completedInRange : openInRange).filter((cycle) => {
      const company = cycle.company || "Unknown";
      const group = cycle.group || "Unknown group";
      return (selectedCompanies.length === 0 || selectedCompanies.includes(company)) && (selectedGroup == null || group === selectedGroup);
    });
    return definitions.map((bucket) => ({
      ...bucket,
      count: cycles.filter((cycle) => cycle.days > bucket.minDays && (bucket.maxDays == null || cycle.days <= bucket.maxDays)).length,
    }));
  }, [completedInRange, openInRange, isCompleted, selectedCompanies, selectedGroup]);
  const activeCycles = isCompleted ? completedInRange : openInRange;
  const companyOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cycle of activeCycles) {
      const group = cycle.group || "Unknown group";
      if (selectedGroup != null && group !== selectedGroup) continue;
      if (ageFilter != null && !(cycle.days > ageFilter.minDays && (ageFilter.maxDays == null || cycle.days <= ageFilter.maxDays))) continue;
      const company = cycle.company || "Unknown";
      counts.set(company, (counts.get(company) ?? 0) + 1);
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [activeCycles, selectedGroup, ageFilter]);
  const companyBreakdown = companySelectionFromMenu && companyMenuScope.length > 0
    ? companyOptions.filter((company) => companyMenuScope.includes(company.label))
    : companyOptions;
  const equipmentOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cycle of activeCycles) {
      const company = cycle.company || "Unknown";
      if (selectedCompanies.length > 0 && !selectedCompanies.includes(company)) continue;
      if (ageFilter != null && !(cycle.days > ageFilter.minDays && (ageFilter.maxDays == null || cycle.days <= ageFilter.maxDays))) continue;
      const group = cycle.group || "Unknown group";
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [activeCycles, selectedCompanies, ageFilter]);
  const equipmentBreakdown = groupSelectionFromMenu && selectedGroup != null
    ? equipmentOptions.filter((group) => group.label === selectedGroup)
    : equipmentOptions;
  const displayedDurationBuckets = ageSelectionFromMenu && ageFilter != null
    ? durationBuckets.filter((bucket) => bucket.label === ageFilter.label)
    : durationBuckets;
  const companySla = useMemo(() => {
    const companies = new Map<string, SlaCycle[]>();
    for (const cycle of completedInRange) {
      const company = cycle.company || "Unknown";
      companies.set(company, [...(companies.get(company) ?? []), cycle]);
    }
    return [...companies.entries()]
      .map(([label, cycles]) => ({
        label,
        count: Number((cycles.filter((cycle) => cycle.days <= target).length / cycles.length * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [completedInRange, target]);

  const traced = useMemo(() => {
    const needle = traceQuery.trim().toLowerCase();
    const matchesSearch = (cycle: SlaCycle) =>
      !needle || [cycle.company, cycle.group, cycle.equipment, cycle.model, cycle.material, cycle.serial].some((value) => value.toLowerCase().includes(needle));

    const filtered = isCompleted
      ? completedInRange.filter((cycle) => {
          if (!matchesSearch(cycle)) return false;
          const company = cycle.company || "Unknown";
          const group = cycle.group || "Unknown group";
          return (selectedCompanies.length === 0 || selectedCompanies.includes(company)) && (selectedGroup == null || group === selectedGroup) && (ageFilter == null || (cycle.days > ageFilter.minDays && (ageFilter.maxDays == null || cycle.days <= ageFilter.maxDays)));
        })
      : openInRange.filter((cycle) => {
          if (!matchesSearch(cycle)) return false;
          const company = cycle.company || "Unknown";
          const group = cycle.group || "Unknown group";
          return (selectedCompanies.length === 0 || selectedCompanies.includes(company)) && (selectedGroup == null || group === selectedGroup) && (ageFilter == null || (cycle.days > ageFilter.minDays && (ageFilter.maxDays == null || cycle.days <= ageFilter.maxDays)));
        });

    const value = (cycle: SlaCycle): string | number => {
      if (traceSort === "status") return repairStatus(cycle).label;
      if (traceSort === "company") return cycle.company || "Unknown";
      if (traceSort === "group") return cycle.group || "Unknown group";
      if (traceSort === "equipment") return cycle.equipment || "Unknown equipment";
      if (traceSort === "material") return cycle.material || "Unknown material";
      if (traceSort === "model") return cycle.model || "Unknown model";
      if (traceSort === "serial") return cycle.serial;
      if (traceSort === "input") return cycle.receivedAt.getTime();
      if (traceSort === "output") return cycle.completedAt?.getTime() ?? 0;
      return cycle.days;
    };
    const direction = sortDirection === "asc" ? 1 : -1;
    return filtered.sort((a, b) => {
      const left = value(a);
      const right = value(b);
      const compared = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), undefined, { sensitivity: "base", numeric: true });
      return compared * direction || b.days - a.days;
    });
  }, [completedInRange, openInRange, isCompleted, traceQuery, selectedCompanies, selectedGroup, ageFilter, traceSort, sortDirection]);

  const tracePageCount = Math.max(1, Math.ceil(traced.length / TRACEBACK_PAGE_SIZE));
  const safeTracePage = Math.min(tracePage, tracePageCount - 1);
  const visibleRows = traced.slice(safeTracePage * TRACEBACK_PAGE_SIZE, (safeTracePage + 1) * TRACEBACK_PAGE_SIZE);
  const columnCount = 10;
  const displayedCompanySelections = companySelectionFromMenu ? companyMenuScope : selectedCompanies;
  const filterSummary = [
    displayedCompanySelections.length > 0 ? `${displayedCompanySelections.length} ${displayedCompanySelections.length === 1 ? "company" : "companies"}` : null,
    selectedGroup,
    ageFilter?.label,
  ].filter((value): value is string => value != null).join(" · ") || "All filters";

  const switchMode = (next: RepairMode) => {
    setMode(next);
    setSelectedCompanies([]);
    setCompanyMenuScope([]);
    setSelectedGroup(null);
    setAgeFilter(null);
    setCompanySelectionFromMenu(false);
    setGroupSelectionFromMenu(false);
    setAgeSelectionFromMenu(false);
    setTracePage(0);
  };

  const toggleSort = (key: TraceSortKey) => {
    if (traceSort === key) setSortDirection((current) => current === "asc" ? "desc" : "asc");
    else {
      setTraceSort(key);
      setSortDirection("asc");
    }
    setTracePage(0);
  };

  const selectDuration = (bucket: { minDays: number; maxDays: number | null; label: string }) => {
    setAgeFilter((current) => current?.label === bucket.label ? null : bucket);
    setAgeSelectionFromMenu(false);
    setTracePage(0);
  };

  const downloadTracebackCsv = () => {
    const headings = ["Repair status", "Company", "Equipment group", "Equipment", "Material", "Model", "Serial", "Input date", "Output date", "Age days"];
    const lines = [
      headings.map(csvCell).join(","),
      ...traced.map((cycle) => [
        repairStatus(cycle).label,
        cycle.company || "Unknown",
        cycle.group || "Unknown group",
        cycle.equipment || "Unknown equipment",
        cycle.material || "Unknown material",
        cycle.model || "Unknown model",
        cycle.serial,
        formatDisplayDate(cycle.receivedAt),
        cycle.completedAt ? formatDisplayDate(cycle.completedAt) : "",
        cycle.days,
      ].map(csvCell).join(",")),
    ];
    const blob = new Blob(["\uFEFF", lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${mode}-repair-traceback-${startMonth}-to-${endMonth}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const sortHead = (key: TraceSortKey, label: string, alignRight = false) => (
    <TableHead aria-sort={traceSort === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none"} className={alignRight ? "text-right" : undefined}>
      <button type="button" onClick={() => toggleSort(key)} className={`inline-flex items-center gap-1.5 font-medium hover:text-foreground ${alignRight ? "ml-auto" : ""}`}>
        {label}
        <ArrowUpDown className={`size-3.5 ${traceSort === key ? "text-primary" : "opacity-45"}`} aria-hidden="true" />
      </button>
    </TableHead>
  );

  return (
    <section className="mb-10">
      {!analysis.available ? (
        <Card className="rounded-xl border-dashed px-6 py-8 text-center shadow-xs ring-0">
          <Timer className="mx-auto size-7 text-muted-foreground" />
          <h3 className="mt-3 font-heading font-semibold">Lifecycle data required</h3>
          <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{analysis.reason}</p>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border bg-muted/40 p-1" aria-label="Repair status view">
              {([['ongoing', 'Ongoing'], ['completed', 'Completed']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => switchMode(value)} aria-pressed={mode === value} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${mode === value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button type="button" variant="outline" className="max-w-full truncate">{filterSummary}</Button>} />
              <DropdownMenuContent align="end" className="max-h-96 min-w-64 overflow-y-auto">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Companies</DropdownMenuLabel>
                  {companyOptions.map((company) => (
                    <DropdownMenuCheckboxItem
                      key={company.label}
                      checked={displayedCompanySelections.includes(company.label)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...new Set([...displayedCompanySelections, company.label])]
                          : displayedCompanySelections.filter((item) => item !== company.label);
                        setCompanyMenuScope(next);
                        setSelectedCompanies(next);
                        setCompanySelectionFromMenu(true);
                        setTracePage(0);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{company.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{company.count.toLocaleString()}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Equipment groups</DropdownMenuLabel>
                  {equipmentOptions.map((group) => (
                    <DropdownMenuCheckboxItem
                      key={group.label}
                      checked={selectedGroup === group.label}
                      onCheckedChange={(checked) => {
                        setSelectedGroup(checked ? group.label : null);
                        setGroupSelectionFromMenu(checked);
                        setTracePage(0);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{group.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{group.count.toLocaleString()}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{isCompleted ? "Turnaround" : "Aging"}</DropdownMenuLabel>
                  {durationBuckets.map((bucket) => (
                    <DropdownMenuCheckboxItem
                      key={bucket.label}
                      checked={ageFilter?.label === bucket.label}
                      onCheckedChange={(checked) => {
                        setAgeFilter(checked ? bucket : null);
                        setAgeSelectionFromMenu(checked);
                        setTracePage(0);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{bucket.label}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{bucket.count.toLocaleString()}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title={`${isCompleted ? "Completed" : "Ongoing"} repairs by company`} subtitle="Uses the selected equipment group and aging range. Select a slice to further filter the dashboard." height={330}>
              <BreakdownPieChart
                data={companyBreakdown}
                selectedLabel={selectedCompanies.length === 1 ? selectedCompanies[0] : null}
                onSelect={(company) => {
                  setSelectedCompanies((current) => current.length === 1 && current[0] === company ? [] : [company]);
                  if (companyMenuScope.length === 0) setCompanySelectionFromMenu(false);
                  setTracePage(0);
                }}
              />
            </ChartCard>
            <ChartCard title={`${isCompleted ? "Completed" : "Ongoing"} repairs by equipment group`} subtitle="Uses the selected companies and aging range. Select a slice to further filter the dashboard." height={330}>
              <BreakdownPieChart
                data={equipmentBreakdown}
                selectedLabel={selectedGroup}
                onSelect={(group) => {
                  setSelectedGroup((current) => current === group ? null : group);
                  setGroupSelectionFromMenu(false);
                  setTracePage(0);
                }}
              />
            </ChartCard>
          </div>

          <div className="mt-4">
            <ChartCard
              title={isCompleted ? "Completed repair turnaround" : "Ongoing repair aging"}
              subtitle="Select a duration bar to filter the charts and traceback table. Select it again to clear the filter."
              height={300}
            >
              <RankBarChart
                data={displayedDurationBuckets.map((bucket) => ({ label: bucket.label, count: bucket.count }))}
                color={isCompleted ? "var(--success)" : "var(--warning)"}
                name="Repairs"
                selectedLabel={ageFilter?.label}
                onSelect={(label) => {
                  const bucket = durationBuckets.find((item) => item.label === label);
                  if (bucket) selectDuration(bucket);
                }}
              />
            </ChartCard>
          </div>

          <Card className="mt-4 gap-4 rounded-xl px-5 py-5 shadow-xs ring-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-heading font-semibold">{isCompleted ? "Completed repair traceback" : "Ongoing repair traceback"}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isCompleted
                    ? <>{traced.length.toLocaleString()} completed repairs finishing within {startMonth === endMonth ? formatMonth(startMonth) : `${formatMonth(startMonth)} – ${formatMonth(endMonth)}`}{selectedCompanies.length > 0 ? ` for ${selectedCompanies.join(", ")}` : ""}{selectedGroup ? ` in ${selectedGroup}` : ""}.</>
                    : <>{traced.length.toLocaleString()} ongoing repairs with an input within {startMonth === endMonth ? formatMonth(startMonth) : `${formatMonth(startMonth)} – ${formatMonth(endMonth)}`}{selectedCompanies.length > 0 ? ` for ${selectedCompanies.join(", ")}` : ""}{selectedGroup ? ` in ${selectedGroup}` : ""} and no output.</>}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={downloadTracebackCsv} disabled={traced.length === 0}>
                  <Download data-icon="inline-start" /> Export CSV
                </Button>
                <Input className="sm:w-72" value={traceQuery} onChange={(event) => { setTraceQuery(event.target.value); setTracePage(0); }} placeholder="Search company, model, equipment, serial…" aria-label="Search repairs" />
              </div>
            </div>
            <div className="max-h-96 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {sortHead("status", "Repair status")}
                    {sortHead("company", "Company")}
                    {sortHead("group", "Group")}
                    {sortHead("equipment", "Equipment")}
                    {sortHead("material", "Material")}
                    {sortHead("model", "Model")}
                    {sortHead("serial", "Serial")}
                    {sortHead("input", "Input date")}
                    {sortHead("output", "Output date")}
                    {sortHead("age", "Age", true)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((cycle, index) => {
                    const currentStatus = repairStatus(cycle);
                    return (
                      <TableRow key={`${cycle.material}|${cycle.serial}|${cycle.receivedAt.toISOString()}|${index}`}>
                        <TableCell className="min-w-36">
                          <span
                            className="inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold"
                            style={{
                              color: currentStatus.color,
                              borderColor: `color-mix(in oklch, ${currentStatus.color} 35%, transparent)`,
                              backgroundColor: `color-mix(in oklch, ${currentStatus.color} 10%, transparent)`,
                            }}
                          >
                            {currentStatus.label}
                          </span>
                        </TableCell>
                        <TableCell>{cycle.company || "Unknown"}</TableCell>
                        <TableCell>{cycle.group || "Unknown group"}</TableCell>
                        <TableCell>{cycle.equipment || "Unknown equipment"}</TableCell>
                        <TableCell>{cycle.material || "Unknown material"}</TableCell>
                        <TableCell>{cycle.model || "Unknown model"}</TableCell>
                        <TableCell className="font-mono text-xs">{cycle.serial}</TableCell>
                        <TableCell>{formatDisplayDate(cycle.receivedAt)}</TableCell>
                        <TableCell>{cycle.completedAt ? formatDisplayDate(cycle.completedAt) : "—"}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{cycle.days.toLocaleString()}d</TableCell>
                      </TableRow>
                    );
                  })}
                  {traced.length === 0 ? <TableRow><TableCell colSpan={columnCount} className="py-8 text-center text-muted-foreground">{isCompleted ? "No completed repairs match this range and search." : "No ongoing repairs match this year and search."}</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">Showing {traced.length === 0 ? 0 : safeTracePage * TRACEBACK_PAGE_SIZE + 1}–{Math.min((safeTracePage + 1) * TRACEBACK_PAGE_SIZE, traced.length)} of {traced.length.toLocaleString()} matching {isCompleted ? "completed" : "ongoing"} repairs.</p>
              {tracePageCount > 1 ? <Pager page={safeTracePage} pageCount={tracePageCount} onPageChange={setTracePage} label="Repair traceback pages" /> : null}
            </div>
          </Card>

          <div className="mt-4">
            <ChartCard
              title="Company SLA performance"
              subtitle={`Percentage of each company's completed repairs finished within ${target} days. Output dates follow the selected reporting range.`}
              height={Math.max(240, companySla.length * 42 + 48)}
              action={
                <label className="flex items-center gap-2 text-xs font-medium">
                  SLA target
                  <Input className="w-20" type="number" min={1} max={365} value={target}
                    onChange={(event) => setTarget(Math.max(1, Math.min(365, Number(event.target.value) || 1)))} />
                  days
                </label>
              }
            >
              <RankBarChart
                data={companySla}
                color={paletteColor(1)}
                name={`Completed within ${target} days`}
                valueSuffix="%"
                domainMax={100}
              />
            </ChartCard>
          </div>
        </>
      )}
    </section>
  );
}
