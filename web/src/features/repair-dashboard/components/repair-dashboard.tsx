"use client";

import { useAtomValue, useSetAtom } from "jotai";
import { CloudOff, RefreshCw, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { AllCompaniesView } from "./all-companies-view";
import { AppHeader } from "./app-header";
import { ColumnMapper } from "./column-mapper";
import { CompanyView } from "./company-view";
import { DashboardSidebar } from "./dashboard-sidebar";
import { InsightsView } from "./insights-view";
import { UploadCard } from "./upload-card";
import { VendorScorecardView } from "./vendor-scorecard-view";
import { useLiveSheet } from "../hooks/use-live-sheet";
import { LIVE_SHEET_REF } from "../lib/live-sheet";
import { selectAllCompanies } from "../lib/selectors";
import { INSIGHTS_VIEW, SCORECARD_VIEW } from "../lib/types";
import { dataSourceAtom, datasetAtom, stageAtom, viewAtom } from "../state/atoms";

/** Root client component orchestrating the live / upload → dashboard flow. */
export function RepairDashboard() {
  const stage = useAtomValue(stageAtom);
  const dataset = useAtomValue(datasetAtom);
  const view = useAtomValue(viewAtom);
  const source = useAtomValue(dataSourceAtom);
  const setSource = useSetAtom(dataSourceAtom);

  const live = useLiveSheet();
  const liveActive = source === "live" && LIVE_SHEET_REF !== null;

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <a
        href="#dashboard-content"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to dashboard content
      </a>
      <AppHeader />

      {stage === "upload" ? (
        liveActive ? (
          live.isError ? (
            <LiveErrorCard
              message={
                live.error instanceof Error
                  ? live.error.message
                  : "Could not load the live sheet."
              }
              onRetry={() => live.refetch()}
              onUploadInstead={() => setSource("upload")}
            />
          ) : (
            <LoadingScreen label="Fetching live data from Google Sheets…" />
          )
        ) : (
          <UploadCard />
        )
      ) : null}
      {stage === "map" ? <ColumnMapper /> : null}
      {stage === "loading" ? <LoadingScreen /> : null}

      {stage === "dash" && dataset ? (
        <div className="flex min-h-0 flex-1">
          <DashboardSidebar
            grandTotal={dataset.grandTotal}
            companies={selectAllCompanies(dataset).nav}
          />
          <main
            id="dashboard-content"
            className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 xl:px-8"
          >
            <div key={view} className="page-enter mx-auto w-full max-w-[1600px]">
              {view === "all" ? (
                <AllCompaniesView dataset={dataset} />
              ) : view === SCORECARD_VIEW ? (
                <VendorScorecardView dataset={dataset} />
              ) : view === INSIGHTS_VIEW ? (
                <InsightsView dataset={dataset} />
              ) : (
                <CompanyView dataset={dataset} company={view} />
              )}
            </div>
          </main>
        </div>
      ) : null}
    </div>
  );
}

function LoadingScreen({ label = "Processing data…" }: { label?: string }) {
  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px] animate-pulse">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-64 max-w-[70vw]" />
            <Skeleton className="h-4 w-96 max-w-[82vw]" />
          </div>
          <Skeleton className="hidden h-9 w-40 sm:block" />
        </div>
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.65fr_1fr]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
        <p className="mt-5 text-center text-xs font-medium text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

interface LiveErrorCardProps {
  message: string;
  onRetry: () => void;
  onUploadInstead: () => void;
}

/** Shown when the live sheet cannot be loaded; offers retry or manual upload. */
function LiveErrorCard({ message, onRetry, onUploadInstead }: LiveErrorCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
      <Card className="relative w-full max-w-xl gap-0 overflow-hidden rounded-2xl px-6 py-9 text-center shadow-lg ring-0 sm:px-10 sm:py-11">
        <span className="absolute inset-x-0 top-0 h-1 bg-destructive" />
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/8">
          <CloudOff className="size-7 text-destructive" />
        </div>
        <p className="mb-2 text-xs font-semibold text-destructive">Connection issue</p>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">
          Live data unavailable
        </h2>
        <p
          role="alert"
          className="mx-auto mb-7 mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground"
        >
          {message}
        </p>
        <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row">
          <Button variant="outline" onClick={onUploadInstead}>
            <Upload data-icon="inline-start" />
            Upload CSV instead
          </Button>
          <Button onClick={onRetry}>
            <RefreshCw data-icon="inline-start" />
            Try again
          </Button>
        </div>
      </Card>
    </div>
  );
}
