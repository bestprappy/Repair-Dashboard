"use client";

import { useMemo, useState } from "react";

import {
  Award,
  Boxes,
  Building2,
  CircleAlert,
  FileStack,
  Wrench,
} from "lucide-react";

import { ChartCard, SectionHeading } from "@/components/chart-card";
import { MetricCard } from "@/components/metric-card";
import { Pager } from "@/components/pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

import { RankBarChart } from "./charts";
import { ModelListDialog } from "./model-list-dialog";
import {
  selectCompanyRecommendation,
  selectGroupModelRelations,
} from "../lib/insights";
import type {
  CompanyRecommendationAnalysis,
  EvidenceStrength,
  ModelCompanyPerformance,
} from "../lib/insights";
import { formatCurrency, paletteColor } from "../lib/transform";
import type { ColumnMapping, CsvRow } from "../lib/types";

const MIN_CLEAR_LEAD_POINTS = 2;
const MODELS_PER_PAGE = 10;

interface GroupModelRelationSectionProps {
  rows: CsvRow[];
  mapping: ColumnMapping;
}

/** Select an equipment group and page through its ranked model values. */
export function GroupModelRelationSection({
  rows,
  mapping,
}: GroupModelRelationSectionProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [viewAllOpen, setViewAllOpen] = useState(false);
  const [page, setPage] = useState(0);
  const relations = useMemo(
    () => selectGroupModelRelations(rows, mapping),
    [rows, mapping],
  );

  const active =
    relations.find((relation) => relation.group === selectedGroup) ??
    relations[0] ??
    null;
  const leadModel = active?.allModels[0] ?? null;
  // Selection can come from the paged preview or the "view all" dialog, so
  // check against the full model list rather than the current page.
  const activeModel =
    active?.allModels.some((model) => model.model === selectedModel) &&
    selectedModel
      ? selectedModel
      : (leadModel?.model ?? null);
  const activeGroup = active?.group ?? null;
  const recommendation = useMemo(
    () =>
      activeGroup && activeModel
        ? selectCompanyRecommendation(
            rows,
            mapping,
            activeGroup,
            activeModel,
          )
        : null,
    [rows, mapping, activeGroup, activeModel],
  );

  if (
    !mapping.group ||
    !mapping.model ||
    !active ||
    !leadModel ||
    !activeModel
  ) {
    return null;
  }

  const pageCount = Math.max(
    1,
    Math.ceil(active.allModels.length / MODELS_PER_PAGE),
  );
  // `page` is clamped rather than reset in an effect: switching groups can
  // leave it past the new group's last page until the next interaction.
  const currentPage = Math.min(page, pageCount - 1);
  const pageStart = currentPage * MODELS_PER_PAGE;
  const pageModels = active.allModels.slice(
    pageStart,
    pageStart + MODELS_PER_PAGE,
  );
  const rangeStart = pageStart + 1;
  const rangeEnd = pageStart + pageModels.length;

  const chartData = pageModels.map((model) => ({
    label: model.model,
    count: model.count,
  }));

  /** Select a model and jump to the page that shows it. */
  const selectModel = (model: string) => {
    setSelectedModel(model);
    const index = active.allModels.findIndex((item) => item.model === model);
    if (index >= 0) setPage(Math.floor(index / MODELS_PER_PAGE));
  };

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionHeading>Equipment group → model relationship</SectionHeading>
          <p className="-mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Select one equipment group, then page through its models — or open
            the full list — to compare the servicing companies and their
            historical evidence.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <label
            htmlFor="equipment-group-select"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Equipment group
          </label>
          <Select
            value={active.group}
            onValueChange={(value) => {
              if (value) {
                setSelectedGroup(value);
                setSelectedModel(null);
                setPage(0);
              }
            }}
          >
            <SelectTrigger id="equipment-group-select" className="w-full">
              <SelectValue>{active.group}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="max-w-[calc(100vw-2rem)]">
              {relations.map((relation) => (
                <SelectItem key={relation.group} value={relation.group}>
                  <span className="max-w-64 truncate">{relation.group}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {relation.totalRecords.toLocaleString()}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Repair records in group"
          value={active.totalRecords.toLocaleString()}
          sub={active.group}
          accent="blue"
          icon={FileStack}
          featured
        />
        <MetricCard
          label="Distinct repaired models"
          value={active.distinctModels.toLocaleString()}
          sub="Models with at least one record"
          accent="violet"
          icon={Boxes}
        />
        <MetricCard
          label="Top repaired model"
          value={leadModel.model}
          sub={`${leadModel.count.toLocaleString()} records · ${leadModel.sharePct.toFixed(1)}% share`}
          accent="teal"
          icon={Wrench}
          compactValue
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
        <ChartCard
          title={`Models ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${active.distinctModels.toLocaleString()} in ${active.group}`}
          subtitle="Ranked by repair-record count. Select a bar to update the company evidence below."
          height={Math.max(340, chartData.length * 42 + 40)}
          action={
            active.distinctModels > MODELS_PER_PAGE ? (
              <div className="flex items-center gap-2">
                <Pager
                  page={currentPage}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  label="Model chart pages"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewAllOpen(true)}
                >
                  View all {active.distinctModels.toLocaleString()}
                </Button>
              </div>
            ) : null
          }
        >
          <RankBarChart
            data={chartData}
            color={paletteColor(0)}
            name="Repair records"
            selectedLabel={activeModel}
            onSelect={selectModel}
          />
        </ChartCard>

        <Card className="gap-4 rounded-xl border border-border/80 py-5 shadow-xs">
          <CardHeader className="px-5 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-[14px] font-semibold tracking-[-0.01em]">
                  Model relationship detail
                </CardTitle>
                <CardDescription className="mt-1 text-xs leading-5">
                  Select a model row to compare its companies. Share uses the{" "}
                  {active.modelMappedRecords.toLocaleString()} records in this
                  group that include a model.
                </CardDescription>
              </div>
              {active.distinctModels > MODELS_PER_PAGE ? (
                <div className="flex shrink-0 items-center gap-2">
                  <Pager
                    page={currentPage}
                    pageCount={pageCount}
                    onPageChange={setPage}
                    label="Model detail pages"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewAllOpen(true)}
                  >
                    View all model
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/35 hover:bg-muted/35">
                  <TableHead className="pl-5 sm:pl-6">Model</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead className="text-right">Serviced by</TableHead>
                  <TableHead className="pr-5 text-right sm:pr-6">
                    PASS rate (completed)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageModels.map((model, index) => {
                  const selected = activeModel === model.model;
                  const rank = pageStart + index + 1;
                  return (
                    <TableRow
                      key={model.model}
                      data-state={selected ? "selected" : undefined}
                    >
                      <TableCell className="max-w-64 pl-5 font-medium sm:pl-6">
                        <button
                          type="button"
                          onClick={() => selectModel(model.model)}
                          aria-pressed={selected}
                          className="flex w-full items-center gap-2.5 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/8 text-[10px] font-semibold tabular-nums text-primary",
                              selected && "bg-primary text-primary-foreground",
                            )}
                          >
                            {rank}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate" title={model.model}>
                              {model.model}
                            </p>
                            <p className="mt-0.5 text-[10px] font-normal tabular-nums text-muted-foreground">
                              {model.pricedRecords > 0
                                ? `${formatCurrency(model.reportedAmount)} reported`
                                : "No repair amount reported"}
                            </p>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {model.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {model.sharePct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {model.companies.length > 0 ? (
                          <div className="ml-auto flex max-w-44 flex-wrap justify-end gap-1">
                            {model.companies.map((company) => (
                              <span
                                key={company.company}
                                title={`${company.count.toLocaleString()} repair records`}
                                className="rounded-md bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                              >
                                {company.company}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-5 text-right sm:pr-6">
                        <span className="font-medium tabular-nums">
                          {model.completedRecords === 0
                            ? "—"
                            : model.completedRecords < 10
                              ? "Suppressed"
                              : `${model.passRate?.toFixed(1)}%`}
                        </span>
                        <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                          ({model.completedRecords.toLocaleString()})
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {recommendation ? (
        <CompanyRecommendationCard analysis={recommendation} />
      ) : null}

      <ModelListDialog
        open={viewAllOpen}
        onOpenChange={setViewAllOpen}
        group={active.group}
        models={active.allModels}
        selectedModel={activeModel}
        onSelectModel={selectModel}
      />
    </section>
  );
}

const EVIDENCE_STYLE: Record<EvidenceStrength, string> = {
  Strong: "border-success/25 bg-success/10 text-success",
  Moderate: "border-primary/25 bg-primary/10 text-primary",
  Limited: "border-warning/25 bg-warning/10 text-warning",
  Insufficient: "border-border bg-muted text-muted-foreground",
};

function EvidenceBadge({ value }: { value: EvidenceStrength }) {
  return (
    <Badge variant="outline" className={EVIDENCE_STYLE[value]}>
      {value} PASS sample
    </Badge>
  );
}

export function CompanyRecommendationCard({
  analysis,
}: {
  analysis: CompanyRecommendationAnalysis;
}) {
  const eligible = analysis.companies.filter((company) => company.eligible);
  const candidate = analysis.recommended;
  const runnerUp = eligible[1] ?? null;
  const supportedGap =
    candidate && runnerUp
      ? (candidate.confidenceAdjustedPass ?? 0) -
        (runnerUp.confidenceAdjustedPass ?? 0)
      : null;
  const closeResult =
    eligible.length >= 2 &&
    supportedGap != null &&
    supportedGap < MIN_CLEAR_LEAD_POINTS;
  const clearLeader =
    candidate && eligible.length >= 2 && !closeResult ? candidate : null;
  const singleEligible =
    candidate && eligible.length === 1 ? candidate : null;
  const repeatMode = analysis.companies[0]?.repeatMode ?? "unavailable";

  return (
    <Card
      className="mt-4 gap-5 rounded-xl border border-border/80 py-5 shadow-xs"
    >
      <p className="sr-only" aria-live="polite">
        Company evidence updated for {analysis.model} in {analysis.group}.
      </p>
      <CardHeader className="px-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Award className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-[15px] font-semibold tracking-[-0.01em]">
              Company evidence for {analysis.model}
            </CardTitle>
            <CardDescription className="mt-1 text-xs leading-5">
              {analysis.group} · historical records in the current dataset
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-5 sm:px-6">
        {clearLeader ? (
          <RecommendationSummary
            company={clearLeader}
            label="Best-supported company in this dataset"
            reason={`Highest confidence-adjusted completed PASS result among ${eligible.length} eligible companies.`}
            tone="leader"
          />
        ) : closeResult && candidate && runnerUp ? (
          <div className="rounded-xl border border-warning/25 bg-warning/6 p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/12 text-warning">
                <CircleAlert className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-warning">
                  No clear leader
                </p>
                <p className="mt-1 font-heading text-xl font-semibold tracking-tight">
                  {candidate.company} and {runnerUp.company} are closely matched
                </p>
                <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
                  Their confidence-adjusted completed PASS results are within {" "}
                  {MIN_CLEAR_LEAD_POINTS} percentage points, so the history does
                  not support calling either company clearly better. Review
                  capacity, SLA, and operational constraints before assigning
                  this work.
                </p>
              </div>
            </div>
          </div>
        ) : singleEligible ? (
          <RecommendationSummary
            company={singleEligible}
            label={
              analysis.companies.length === 1
                ? "Only company observed with enough evidence"
                : "Only company with enough evidence"
            }
            reason={
              analysis.companies.length === 1
                ? "There is no second company in this dataset for a reliable comparison."
                : `Other observed companies have fewer than ${analysis.minimumVerdicts} completed verdicts.`
            }
            tone="single"
          />
        ) : (
          <div className="rounded-xl border border-border bg-muted/35 p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CircleAlert className="size-4.5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-heading text-lg font-semibold tracking-tight">
                  Not enough completed evidence
                </p>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                  No company has the required {analysis.minimumVerdicts} combined
                  PASS/NOT PASS verdicts for this equipment group and model.
                  The observed data is still shown below without forcing a
                  leader.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border/80">
          <div className="border-b border-border/80 bg-muted/25 px-4 py-3">
            <p className="text-[13px] font-semibold">
              Companies observed for this model
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Every company with at least one matching sheet record is included.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 hover:bg-muted/20">
                <TableHead className="pl-4">Company</TableHead>
                <TableHead className="text-right">Repair records</TableHead>
                <TableHead className="text-right">
                  PASS rate (completed)
                </TableHead>
                <TableHead className="text-right">Repeat units</TableHead>
                <TableHead className="text-right">Median amount</TableHead>
                <TableHead className="pr-4 text-right">PASS sample</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.companies.map((company) => {
                const isLeader = clearLeader?.company === company.company;
                return (
                  <TableRow
                    key={company.company}
                    className={cn(isLeader && "bg-primary/[0.035]")}
                  >
                    <TableCell className="pl-4 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                          <Building2 className="size-3.5" aria-hidden="true" />
                        </span>
                        <span>{company.company}</span>
                        {isLeader ? (
                          <Badge className="bg-primary/10 text-primary">
                            Leader
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {company.repairRecords.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {company.completedVerdicts === 0 ? (
                        <MetricWithDenominator
                          value="—"
                          detail="no PASS/NOT PASS verdicts"
                        />
                      ) : company.completedVerdicts < 10 ? (
                        <MetricWithDenominator
                          value="Suppressed"
                          detail={`${company.completedVerdicts.toLocaleString()} verdicts · minimum 10`}
                        />
                      ) : (
                        <MetricWithDenominator
                          value={`${company.passCount.toLocaleString()}/${company.completedVerdicts.toLocaleString()} · ${company.passRate?.toFixed(1)}%`}
                          detail="PASS / (PASS + NOT PASS)"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {company.repeatRate == null ? (
                        <MetricWithDenominator
                          value="—"
                          detail={repeatEvidenceDetail(company)}
                        />
                      ) : (
                        <MetricWithDenominator
                          value={`${company.repeatUnits.toLocaleString()}/${company.trackedUnits.toLocaleString()} · ${company.repeatRate.toFixed(1)}%`}
                          detail={repeatEvidenceDetail(company)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {company.medianAmount == null ? (
                        <MetricWithDenominator
                          value="—"
                          detail={amountEvidenceDetail(company)}
                        />
                      ) : (
                        <MetricWithDenominator
                          value={formatCurrency(company.medianAmount)}
                          detail={amountEvidenceDetail(company)}
                        />
                      )}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <EvidenceBadge value={company.evidence} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <p className="text-[11px] leading-5 text-muted-foreground">
          {recommendationMethod(analysis, repeatMode)}
        </p>
      </CardContent>
    </Card>
  );
}

function recommendationMethod(
  analysis: CompanyRecommendationAnalysis,
  repeatMode: ModelCompanyPerformance["repeatMode"],
): string {
  const outcomeRows =
    analysis.stageMode === "repair-stages" ? "output-stage" : "all matching";
  const amountRows =
    analysis.stageMode === "repair-stages" ? "output" : "matching";
  const repeatMethod =
    repeatMode === "input-events"
      ? "It uses distinct Material + Serial input events and is shown only at 80% identifier coverage."
      : repeatMode === "paired-row-estimate"
        ? "With no recognizable repair stage, it estimates cycles from paired rows and is shown only at 80% identifier coverage."
        : "It is unavailable without mapped Material and Serial columns.";

  return `Method: PASS uses ${outcomeRows} rows and PASS / (PASS + NOT PASS). It is suppressed below 10 verdicts and needs at least ${analysis.minimumVerdicts} verdicts for ranking. Eligible companies are ranked only by the 95% Wilson lower bound. Repeat repair is descriptive and never changes the ranking. ${repeatMethod} Median amount uses positive PASS ${amountRows} amounts, is suppressed below five priced rows, stays descriptive, and never changes the ranking. Group and model labels are matched exactly as written in the source sheet; repair records remain sheet rows rather than deduplicated repair cycles.`;
}

function repeatEvidenceDetail(
  company: ModelCompanyPerformance,
  includeCounts = false,
): string {
  const coverage = company.identifierCoveragePct;
  if (
    company.repeatUnavailableReason === "identifier-columns-unavailable"
  ) {
    return "Material / Serial columns unavailable";
  }
  if (company.repeatUnavailableReason === "no-input-records") {
    return "no repair-input records";
  }
  if (company.repeatUnavailableReason === "no-trackable-units") {
    return "no trackable Material + Serial units";
  }
  if (coverage == null) return "repeat evidence unavailable";
  if (company.repeatRate == null) {
    return `${coverage.toFixed(1)}% identifier coverage · minimum 80%`;
  }

  const counts = includeCounts
    ? `${company.repeatUnits.toLocaleString()}/${company.trackedUnits.toLocaleString()} tracked units · `
    : "";
  const estimate =
    company.repeatMode === "paired-row-estimate"
      ? " · estimated from paired rows"
      : "";
  return `${counts}${coverage.toFixed(1)}% ID coverage${estimate} · descriptive only`;
}

function amountEvidenceDetail(company: ModelCompanyPerformance): string {
  if (company.amountUnavailableReason === "amount-column-unavailable") {
    return "Amount column unavailable";
  }
  if (company.amountUnavailableReason === "no-completed-pass-rows") {
    return "no completed PASS rows";
  }
  const coverage =
    company.amountCoveragePct == null
      ? "no completed PASS rows"
      : `${company.amountCoveragePct.toFixed(1)}% PASS coverage`;
  if (company.medianAmount == null) {
    return `${company.pricedRecords.toLocaleString()} priced PASS rows · ${coverage} · minimum 5`;
  }

  return `${company.pricedRecords.toLocaleString()} priced PASS rows · ${coverage} · descriptive only`;
}

function RecommendationSummary({
  company,
  label,
  reason,
  tone,
}: {
  company: ModelCompanyPerformance;
  label: string;
  reason: string;
  tone: "leader" | "single";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-5",
        tone === "leader"
          ? "border-primary/25 bg-primary/[0.035]"
          : "border-border bg-muted/30",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            {label}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">
            {company.company}
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            {reason}
          </p>
        </div>
        <EvidenceBadge value={company.evidence} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <EvidenceMetric
          label="PASS rate (completed)"
          value={
            company.passRate == null ? "—" : `${company.passRate.toFixed(1)}%`
          }
          detail={`${company.passCount.toLocaleString()}/${company.completedVerdicts.toLocaleString()} verdicts`}
        />
        <EvidenceMetric
          label="Repair records"
          value={company.repairRecords.toLocaleString()}
          detail="matching sheet rows"
        />
        <EvidenceMetric
          label="Repeat units"
          value={
            company.repeatRate == null
              ? "—"
              : `${company.repeatRate.toFixed(1)}%`
          }
          detail={repeatEvidenceDetail(company, true)}
        />
        <EvidenceMetric
          label="Median amount"
          value={
            company.medianAmount == null
              ? "—"
              : formatCurrency(company.medianAmount)
          }
          detail={amountEvidenceDetail(company)}
        />
      </div>
    </div>
  );
}

function EvidenceMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border/75 bg-card/75 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-heading text-lg font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function MetricWithDenominator({
  value,
  detail,
}: {
  value: string;
  detail: string;
}) {
  return (
    <div>
      <p className="font-medium tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{detail}</p>
    </div>
  );
}
