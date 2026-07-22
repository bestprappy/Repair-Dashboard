"use client";

import { useMemo, useState } from "react";

import { Download, X } from "lucide-react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import { FilterPills } from "@/components/filter-pills";
import { Pager } from "@/components/pager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { GroupCountChart } from "./charts";
import { formatCurrency, formatDisplayDate, statusColor } from "../lib/transform";
import { selectGroupStatusDetails, selectStatusGroups } from "../lib/selectors";
import type { CompanyData } from "../lib/types";

const ROWS_PER_PAGE = 100;

interface GroupCountSectionProps {
  data: CompanyData;
  allStatuses: string[];
  activeStatuses: string[];
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Group counts per status with chart-to-table drill-down and CSV export. */
export function GroupCountSection({
  data,
  allStatuses,
  activeStatuses,
}: GroupCountSectionProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const allDetails = useMemo(() => selectGroupStatusDetails(data), [data]);

  const visibleStatuses = selectedStatus
    ? activeStatuses.filter((status) => status === selectedStatus)
    : activeStatuses;
  const cards = visibleStatuses
    .map((status) => ({
      status,
      color: statusColor(status, allStatuses.indexOf(status)),
      groups: selectStatusGroups(data, status),
    }))
    .filter((card) => card.groups.length > 0);

  const tableRows = allDetails.filter(
    (row) =>
      (!selectedStatus || row.status === selectedStatus) &&
      (!selectedGroup || row.group === selectedGroup),
  );
  const pageCount = Math.max(1, Math.ceil(tableRows.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = tableRows.slice(
    currentPage * ROWS_PER_PAGE,
    (currentPage + 1) * ROWS_PER_PAGE,
  );

  const chooseStatus = (status: string | null) => {
    setSelectedStatus(status);
    setSelectedGroup(null);
    setPage(0);
  };
  const chooseGroup = (status: string, group: string) => {
    setSelectedStatus(status);
    setSelectedGroup((current) =>
      selectedStatus === status && current === group ? null : group,
    );
    setPage(0);
  };
  const clearDetail = () => {
    setSelectedStatus(null);
    setSelectedGroup(null);
    setPage(0);
  };
  const downloadCsv = () => {
    const headings = ["Status", "Equipment group", "Model", "Equipment", "Input date", "Output date", "Records", "Amount"];
    const lines = [
      headings.map(csvCell).join(","),
      ...tableRows.map((row) =>
        [row.status, row.group, row.model, row.equipment, formatDisplayDate(row.inputDate), formatDisplayDate(row.outputDate), row.count, row.amount]
          .map(csvCell)
          .join(","),
      ),
    ];
    const blob = new Blob(["\uFEFF", lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "equipment-groups-by-status.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mb-10">
      <SectionHeading>Equipment groups by status</SectionHeading>
      <FilterPills
        label="Status:"
        options={activeStatuses}
        value={selectedStatus}
        onChange={chooseStatus}
      />

      {cards.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No group data.</p>
      ) : selectedStatus ? (
        <div className="w-full">
          <ChartCard
            title={cards[0].status}
            subtitle="Select an equipment group to filter the detail table below."
            height={Math.max(260, cards[0].groups.length * 38 + 80)}
          >
            <GroupCountChart
              data={cards[0].groups}
              color={cards[0].color}
              selectedGroup={selectedGroup ?? undefined}
              onSelect={(group) => chooseGroup(cards[0].status, group)}
            />
          </ChartCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {cards.map((card) => (
            <ChartCard
              key={card.status}
              title={card.status}
              subtitle="Select a bar to view its models and details."
              height={Math.max(200, card.groups.length * 36 + 70)}
            >
              <GroupCountChart
                data={card.groups}
                color={card.color}
                onSelect={(group) => chooseGroup(card.status, group)}
              />
            </ChartCard>
          ))}
        </div>
      )}

      <Card className="mt-4 gap-4 rounded-xl border border-border/80 py-5 shadow-xs">
        <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-5 sm:px-6">
          <div className="min-w-0">
            <CardTitle className="text-[14px] font-semibold">Equipment groups by status table</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedStatus
                ? `${selectedStatus}${selectedGroup ? ` / ${selectedGroup}` : ""}`
                : "All statuses and equipment groups"}
              {` · ${tableRows.length.toLocaleString()} rows`}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 justify-self-end">
            {selectedStatus || selectedGroup ? (
              <Button type="button" variant="ghost" size="sm" onClick={clearDetail}>
                <X data-icon="inline-start" /> Clear
              </Button>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={downloadCsv} disabled={tableRows.length === 0}>
              <Download data-icon="inline-start" /> Download CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/35 hover:bg-muted/35">
                  <TableHead className="pl-5 sm:pl-6">Status</TableHead>
                  <TableHead>Equipment group</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Input date</TableHead>
                  <TableHead>Output date</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="pr-5 text-right sm:pr-6">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row) => (
                  <TableRow key={`${row.status}\u0000${row.group}\u0000${row.model}\u0000${row.equipment}\u0000${row.inputDate}\u0000${row.outputDate}`}>
                    <TableCell className="pl-5 font-medium sm:pl-6">{row.status}</TableCell>
                    <TableCell>{row.group}</TableCell>
                    <TableCell>{row.model}</TableCell>
                    <TableCell>{row.equipment}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDisplayDate(row.inputDate) || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDisplayDate(row.outputDate) || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.count.toLocaleString()}</TableCell>
                    <TableCell className="pr-5 text-right tabular-nums sm:pr-6">{formatCurrency(row.amount, 2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {tableRows.length > ROWS_PER_PAGE ? (
            <div className="flex justify-end border-t px-5 pt-4 sm:px-6">
              <Pager page={currentPage} pageCount={pageCount} onPageChange={setPage} label="Equipment detail pages" />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
