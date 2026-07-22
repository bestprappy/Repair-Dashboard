"use client";

import { useAtom } from "jotai";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DEFAULT_END_MONTH,
  DEFAULT_START_MONTH,
  endMonthAtom,
  startMonthAtom,
} from "../state/atoms";

const CURRENT_YEAR = new Date().getFullYear();

const MONTH_OPTIONS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function formatRangeMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

interface DateRangeControlProps {
  /** Months present in the data, used to build the year options. */
  availableMonths: string[];
  /** Disabled when no Y&M column is mapped, so no date filtering is possible. */
  disabled?: boolean;
}

/**
 * Shared reporting-window control. Reads and writes the global
 * `startMonthAtom` / `endMonthAtom`, so a change here re-filters every page.
 */
export function DateRangeControl({
  availableMonths,
  disabled = false,
}: DateRangeControlProps) {
  const [startMonth, setStartMonth] = useAtom(startMonthAtom);
  const [endMonth, setEndMonth] = useAtom(endMonthAtom);

  const years = [
    ...new Set([
      String(CURRENT_YEAR),
      ...availableMonths.map((month) => month.slice(0, 4)),
      startMonth.slice(0, 4),
      endMonth.slice(0, 4),
    ]),
  ].sort((a, b) => Number(b) - Number(a));

  const label =
    startMonth === endMonth
      ? formatRangeMonth(startMonth)
      : `${formatRangeMonth(startMonth)} – ${formatRangeMonth(endMonth)}`;

  // Keep the window ordered no matter which bound the user edits.
  const handleStartChange = (value: string) => {
    setStartMonth(value);
    if (value > endMonth) setEndMonth(value);
  };
  const handleEndChange = (value: string) => {
    setEndMonth(value);
    if (value < startMonth) setStartMonth(value);
  };
  const handleReset = () => {
    setStartMonth(DEFAULT_START_MONTH);
    setEndMonth(DEFAULT_END_MONTH);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className="font-medium"
            title={disabled ? "Map the Y&M column to filter by date" : label}
          >
            <CalendarDays className="text-primary" />
            {disabled ? "Date unavailable" : label}
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] p-4"
      >
        <p className="text-sm font-semibold text-foreground">Date range</p>
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
          Applies to every dashboard page. Metrics and charts use records within
          these months.
        </p>
        <div className="mt-4 space-y-3">
          <MonthYearSelect
            label="From"
            value={startMonth}
            years={years}
            onChange={handleStartChange}
          />
          <MonthYearSelect
            label="To"
            value={endMonth}
            years={years}
            onChange={handleEndChange}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleReset}
          className="mt-3 w-full"
        >
          Reset to {CURRENT_YEAR}
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MonthYearSelect({
  label,
  value,
  years,
  onChange,
}: {
  label: string;
  value: string;
  years: string[];
  onChange: (value: string) => void;
}) {
  const [year, month] = value.split("-");

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
        <Select
          value={month}
          onValueChange={(nextMonth) =>
            nextMonth && onChange(`${year}-${nextMonth}`)
          }
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((name, index) => {
              const number = String(index + 1).padStart(2, "0");
              return (
                <SelectItem key={number} value={number}>
                  <span className="min-w-0 truncate">{name}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select
          value={year}
          onValueChange={(nextYear) => nextYear && onChange(`${nextYear}-${month}`)}
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
