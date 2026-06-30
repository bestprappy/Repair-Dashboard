"use client";

import { useAtomValue } from "jotai";

import { AllCompaniesView } from "./all-companies-view";
import { AppHeader } from "./app-header";
import { ColumnMapper } from "./column-mapper";
import { CompanyView } from "./company-view";
import { DashboardSidebar } from "./dashboard-sidebar";
import { UploadCard } from "./upload-card";
import { selectAllCompanies } from "../lib/selectors";
import { datasetAtom, stageAtom, viewAtom } from "../state/atoms";

/** Root client component orchestrating the upload → map → dashboard flow. */
export function RepairDashboard() {
  const stage = useAtomValue(stageAtom);
  const dataset = useAtomValue(datasetAtom);
  const view = useAtomValue(viewAtom);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />

      {stage === "upload" ? <UploadCard /> : null}
      {stage === "map" ? <ColumnMapper /> : null}
      {stage === "loading" ? <LoadingScreen /> : null}

      {stage === "dash" && dataset ? (
        <div className="flex flex-1">
          <DashboardSidebar
            grandTotal={dataset.grandTotal}
            companies={selectAllCompanies(dataset).nav}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden p-7">
            {view === "all" ? (
              <AllCompaniesView dataset={dataset} />
            ) : (
              <CompanyView dataset={dataset} company={view} />
            )}
          </main>
        </div>
      ) : null}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-[calc(100vh-62px)] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className="size-1.5 animate-pulse rounded-full bg-primary"
            style={{ animationDelay: `${index * 0.2}s` }}
          />
        ))}
      </div>
      Processing data…
    </div>
  );
}
