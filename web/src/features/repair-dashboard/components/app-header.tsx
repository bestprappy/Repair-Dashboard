"use client";

import { useSyncExternalStore } from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useTheme } from "next-themes";
import { Moon, RefreshCw, Sun, Upload, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeColorMenu } from "@/components/theme-color-menu";

import { LIVE_SHEET_REF } from "../lib/live-sheet";
import { INSIGHTS_VIEW, RECOMMENDATION_VIEW } from "../lib/types";
import {
  dataSourceAtom,
  datasetAtom,
  lastUpdatedAtom,
  stageAtom,
  summaryAtom,
  viewAtom,
} from "../state/atoms";

const emptySubscribe = () => () => {};

/** False during SSR/hydration, true after — gates the theme icon. */
function useMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

/** Sticky utility bar with mobile navigation, source state, and theme. */
export function AppHeader() {
  const summary = useAtomValue(summaryAtom);
  const dataset = useAtomValue(datasetAtom);
  const source = useAtomValue(dataSourceAtom);
  const lastUpdated = useAtomValue(lastUpdatedAtom);
  const stage = useAtomValue(stageAtom);
  const view = useAtomValue(viewAtom);
  const setView = useSetAtom(viewAtom);
  const setStage = useSetAtom(stageAtom);
  const setSource = useSetAtom(dataSourceAtom);
  const queryClient = useQueryClient();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";
  const liveActive = source === "live" && LIVE_SHEET_REF !== null;
  const companies = dataset
    ? Object.keys(dataset.companies).sort((a, b) => a.localeCompare(b))
    : [];
  const viewLabel =
    view === "all"
      ? "Overview"
      : view === INSIGHTS_VIEW
        ? "Equipment & models"
        : view === RECOMMENDATION_VIEW
          ? "Repair recommendation"
        : view;

  const switchToUpload = () => {
    setSource("upload");
    setStage("upload");
  };

  const switchToLive = () => {
    setSource("live");
    setStage(dataset ? "dash" : "upload");
  };

  const refreshLive = () => {
    void queryClient.invalidateQueries({ queryKey: ["live-sheet"] });
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-2 border-b border-border/80 bg-card/88 px-3 backdrop-blur-xl sm:gap-3 sm:px-5 lg:px-6">
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="brand-gradient relative flex size-9 items-center justify-center rounded-xl shadow-sm shadow-primary/20">
          <span className="relative size-4.5" aria-hidden="true">
            <span className="absolute inset-x-0 top-0 h-1.5 rounded-sm bg-primary-foreground" />
            <span className="absolute bottom-0 left-0 size-1.5 rounded-sm bg-primary-foreground/75" />
            <span className="absolute right-0 bottom-0 h-1.5 w-2.5 rounded-sm bg-primary-foreground" />
          </span>
          {liveActive ? (
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-success" />
          ) : null}
        </span>
        <div className="hidden sm:block">
          <p className="font-heading text-sm font-semibold leading-none tracking-tight">
            Repair Analytics
          </p>
          <p className="mt-1 text-[10px] font-medium text-muted-foreground">
            Inventory operations
          </p>
        </div>
      </div>

      {dataset && stage === "dash" ? (
        <div className="ml-1 min-w-0 flex-1 lg:hidden">
          <Select
            value={view}
            onValueChange={(next) => {
              if (next === "__upload__") {
                switchToUpload();
              } else if (next === "__live__") {
                switchToLive();
              } else if (next) {
                setView(next);
              }
            }}
          >
            <SelectTrigger className="w-full max-w-48 border-transparent bg-muted/60 shadow-none">
              <SelectValue>{viewLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="all">Overview</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
              <SelectItem value={INSIGHTS_VIEW}>Equipment & models</SelectItem>
              <SelectItem value={RECOMMENDATION_VIEW}>
                Repair recommendation
              </SelectItem>
              <SelectSeparator />
              {liveActive ? (
                <SelectItem value="__upload__">Upload a CSV…</SelectItem>
              ) : null}
              {!liveActive && LIVE_SHEET_REF ? (
                <SelectItem value="__live__">Use live Google Sheet</SelectItem>
              ) : null}
              {!liveActive ? (
                <SelectItem value="__upload__">Upload another CSV…</SelectItem>
              ) : null}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="ml-auto flex items-center gap-2">
        {dataset ? (
          <span className="hidden rounded-lg border bg-muted/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground 2xl:inline-flex">
            {summary}
          </span>
        ) : null}

        {liveActive ? (
          <span
            className="hidden h-9 shrink-0 items-center gap-2 rounded-lg border border-success/20 bg-success/8 px-3 text-xs font-medium text-success sm:inline-flex"
            title="Data refreshes automatically from Google Sheets"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            <span className="hidden md:inline">
              {lastUpdated
                ? `Synced ${new Date(lastUpdated).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Syncing"}
            </span>
          </span>
        ) : null}

        {liveActive ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={refreshLive}
            aria-label="Refresh live data now"
            title="Refresh live data now"
            className="hidden text-muted-foreground sm:inline-flex"
          >
            <RefreshCw />
          </Button>
        ) : null}

        {liveActive ? (
          <Button
            type="button"
            variant="outline"
            onClick={switchToUpload}
            aria-label="Upload a CSV instead"
            title="Upload a CSV instead"
            className="hidden md:inline-flex"
          >
            <Upload data-icon="inline-start" />
            <span className="hidden xl:inline">Upload CSV</span>
          </Button>
        ) : null}

        {!liveActive && LIVE_SHEET_REF ? (
          <Button
            type="button"
            variant="outline"
            onClick={switchToLive}
            aria-label="Use live Google Sheet"
            title="Use live Google Sheet"
            className="hidden md:inline-flex"
          >
            <Zap data-icon="inline-start" />
            <span className="hidden xl:inline">Live sheet</span>
          </Button>
        ) : null}

        {!liveActive && dataset ? (
          <Button
            type="button"
            variant="outline"
            onClick={switchToUpload}
            aria-label="Upload another CSV"
            title="Upload another CSV"
            className="hidden md:inline-flex"
          >
            <Upload data-icon="inline-start" />
            <span className="hidden xl:inline">Upload again</span>
          </Button>
        ) : null}

        <ThemeColorMenu />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          title={`Switch to ${isDark ? "light" : "dark"} mode`}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="shrink-0 text-muted-foreground"
        >
          {mounted && !isDark ? <Sun /> : <Moon />}
        </Button>
      </div>
    </header>
  );
}
