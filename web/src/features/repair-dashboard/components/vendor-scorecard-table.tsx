"use client";

import { ArrowUpRight } from "lucide-react";

import { ScoreMeter } from "@/components/score-meter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { GradeBadge, gradeTone } from "./grade-badge";
import type { VendorScore } from "../lib/scorecard";
import { formatCurrency } from "../lib/transform";

interface VendorScorecardTableProps {
  vendors: VendorScore[];
  slaAvailable: boolean;
  repeatAvailable: boolean;
  costAvailable: boolean;
  minimumVerdicts: number;
  onSelectVendor: (company: string) => void;
}

/** Ranked composite table; eligible vendors first, then unranked ones. */
export function VendorScorecardTable({
  vendors,
  slaAvailable,
  repeatAvailable,
  costAvailable,
  minimumVerdicts,
  onSelectVendor,
}: VendorScorecardTableProps) {
  const eligible = vendors.filter((vendor) => vendor.eligible);
  const ineligible = vendors.filter((vendor) => !vendor.eligible);
  const columnCount = 4 + (slaAvailable ? 1 : 0) + (repeatAvailable ? 1 : 0) +
    (costAvailable ? 1 : 0);

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/35 hover:bg-muted/35">
          <TableHead className="w-12 pl-5 sm:pl-6">#</TableHead>
          <TableHead>Company</TableHead>
          <TableHead className="min-w-40">Composite</TableHead>
          <TableHead className="text-right">PASS rate (completed)</TableHead>
          {slaAvailable ? (
            <TableHead className="text-right">SLA compliance</TableHead>
          ) : null}
          {repeatAvailable ? (
            <TableHead className="text-right">Repeat rate</TableHead>
          ) : null}
          {costAvailable ? (
            <TableHead className="text-right">Median amount</TableHead>
          ) : null}
          <TableHead className="pr-5 text-right sm:pr-6">Records</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {eligible.map((vendor) => (
          <VendorRow
            key={vendor.company}
            vendor={vendor}
            slaAvailable={slaAvailable}
            repeatAvailable={repeatAvailable}
            costAvailable={costAvailable}
            onSelectVendor={onSelectVendor}
          />
        ))}

        {ineligible.length > 0 ? (
          <>
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={columnCount}
                className="bg-muted/20 py-2 pl-5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:pl-6"
              >
                Insufficient evidence · fewer than {minimumVerdicts} completed
                verdicts, shown without a grade
              </TableCell>
            </TableRow>
            {ineligible.map((vendor) => (
              <VendorRow
                key={vendor.company}
                vendor={vendor}
                slaAvailable={slaAvailable}
                repeatAvailable={repeatAvailable}
                costAvailable={costAvailable}
                onSelectVendor={onSelectVendor}
                muted
              />
            ))}
          </>
        ) : null}
      </TableBody>
    </Table>
  );
}

interface VendorRowProps {
  vendor: VendorScore;
  slaAvailable: boolean;
  repeatAvailable: boolean;
  costAvailable: boolean;
  onSelectVendor: (company: string) => void;
  muted?: boolean;
}

function VendorRow({
  vendor,
  slaAvailable,
  repeatAvailable,
  costAvailable,
  onSelectVendor,
  muted = false,
}: VendorRowProps) {
  return (
    <TableRow className={cn(muted && "text-muted-foreground")}>
      <TableCell className="pl-5 sm:pl-6">
        {vendor.rank != null ? (
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/8 text-[11px] font-semibold tabular-nums text-primary">
            {vendor.rank}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="max-w-56 font-medium">
        <button
          type="button"
          onClick={() => onSelectVendor(vendor.company)}
          className="group flex w-full items-center gap-2.5 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
          title={`Open ${vendor.company}`}
        >
          <GradeBadge grade={vendor.grade} />
          <span className="flex min-w-0 items-center gap-1">
            <span className="truncate text-foreground" title={vendor.company}>
              {vendor.company}
            </span>
            <ArrowUpRight
              className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden="true"
            />
          </span>
        </button>
      </TableCell>

      <TableCell>
        {vendor.compositeScore != null ? (
          <ScoreMeter
            value={vendor.compositeScore}
            tone={gradeTone(vendor.grade)}
            label={vendor.compositeScore.toFixed(0)}
          />
        ) : (
          <span className="text-xs text-muted-foreground">Not graded</span>
        )}
      </TableCell>

      <TableCell className="text-right">
        <span className="font-medium tabular-nums text-foreground">
          {vendor.completedVerdicts === 0
            ? "—"
            : vendor.completedVerdicts < 10
              ? "Suppressed"
              : `${vendor.passRate?.toFixed(1)}%`}
        </span>
        <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
          ({vendor.completedVerdicts.toLocaleString()})
        </span>
      </TableCell>

      {slaAvailable ? (
        <TableCell className="text-right">
          {vendor.slaCompliancePct == null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <>
              <span className="font-medium tabular-nums text-foreground">
                {vendor.slaCompliancePct.toFixed(1)}%
              </span>
              <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                {vendor.slaMedianDays == null
                  ? ""
                  : `${vendor.slaMedianDays.toFixed(1)}d`}
              </span>
            </>
          )}
        </TableCell>
      ) : null}

      {repeatAvailable ? (
        <TableCell className="text-right tabular-nums">
          {vendor.repeatRate == null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-medium text-foreground">
              {vendor.repeatRate.toFixed(1)}%
            </span>
          )}
        </TableCell>
      ) : null}

      {costAvailable ? (
        <TableCell className="text-right tabular-nums">
          {vendor.medianAmount == null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className="font-medium text-foreground">
              {formatCurrency(vendor.medianAmount)}
            </span>
          )}
        </TableCell>
      ) : null}

      <TableCell className="pr-5 text-right font-medium tabular-nums text-foreground sm:pr-6">
        {vendor.repairRecords.toLocaleString()}
      </TableCell>
    </TableRow>
  );
}
