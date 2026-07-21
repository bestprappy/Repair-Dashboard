"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { useAtomValue } from "jotai";
import { CircleAlert, Route, Search } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CompanyRecommendationCard } from "./group-model-relation-section";
import {
  filterAnalyzedRows,
  selectCompanyRecommendation,
  selectGroupModelRelations,
} from "../lib/insights";
import type { RepairDataset } from "../lib/types";
import { mappingAtom, rawRowsAtom } from "../state/atoms";

/** Focused decision page for routing one equipment model to a repair company. */
export function RepairRecommendationView({
  dataset,
}: {
  dataset: RepairDataset;
}) {
  const rows = useAtomValue(rawRowsAtom);
  const mapping = useAtomValue(mappingAtom);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [modelQuery, setModelQuery] = useState("");
  const deferredQuery = useDeferredValue(modelQuery);

  const analyzedRows = useMemo(
    () => filterAnalyzedRows(rows, mapping),
    [rows, mapping],
  );
  const relations = useMemo(
    () => selectGroupModelRelations(analyzedRows, mapping),
    [analyzedRows, mapping],
  );
  const activeGroup =
    relations.find((relation) => relation.group === selectedGroup) ??
    relations[0] ??
    null;
  const visibleModels = useMemo(() => {
    if (!activeGroup) return [];
    const needle = deferredQuery.trim().toLowerCase();
    return activeGroup.allModels.filter(
      (model) => !needle || model.model.toLowerCase().includes(needle),
    );
  }, [activeGroup, deferredQuery]);
  const modelSuggestions = visibleModels.slice(0, 8);
  const activeModel =
    activeGroup?.allModels.find((model) => model.model === selectedModel) ??
    activeGroup?.allModels[0] ??
    null;
  const recommendation = useMemo(
    () =>
      activeGroup && activeModel
        ? selectCompanyRecommendation(
            analyzedRows,
            mapping,
            activeGroup.group,
            activeModel.model,
          )
        : null,
    [analyzedRows, mapping, activeGroup, activeModel],
  );

  const columnsAvailable = Boolean(
    mapping.group && mapping.model && mapping.company && mapping.status,
  );

  return (
    <div>
      <DashboardPageHeader
        eyebrow="Repair routing"
        title="Repair recommendation"
        description="Choose an equipment type and model to find the best-supported repair company from historical completed outcomes."
        months={dataset.allMonths}
        meta={`${relations.length.toLocaleString()} equipment types`}
      />

      <Card className="relative z-20 gap-4 overflow-visible rounded-xl border border-border/80 py-5 shadow-xs">
        <CardHeader className="px-5 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Route className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-[15px] font-semibold tracking-[-0.01em]">
                Select equipment
              </CardTitle>
              <CardDescription className="mt-1 text-xs leading-5">
                Select the equipment type first, then search or choose its exact
                model. Model labels match the source data as written.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid items-start gap-4 px-5 sm:px-6 lg:grid-cols-3">
          <div>
            <label
              htmlFor="recommendation-group"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Equipment type
            </label>
            <Select
              value={activeGroup?.group ?? undefined}
              disabled={!columnsAvailable || relations.length === 0}
              onValueChange={(value) => {
                if (!value) return;
                setSelectedGroup(value);
                setSelectedModel(null);
                setModelQuery("");
              }}
            >
              <SelectTrigger id="recommendation-group" className="w-full">
                <SelectValue placeholder="Select equipment type" />
              </SelectTrigger>
              <SelectContent>
                {relations.map((relation) => (
                  <SelectItem key={relation.group} value={relation.group}>
                    <span className="min-w-0 flex-1 truncate">
                      {relation.group}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {relation.distinctModels.toLocaleString()} models
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="recommendation-model-search"
              className="mb-1.5 block text-xs font-medium text-muted-foreground"
            >
              Search model
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="recommendation-model-search"
                  type="search"
                  value={modelQuery}
                  disabled={!activeGroup}
                  onChange={(event) => setModelQuery(event.target.value)}
                  placeholder="Search model…"
                  className="pl-9"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={modelQuery.trim().length > 0}
                  aria-controls="recommendation-model-suggestions"
                />
              </div>
              {modelQuery.trim() ? (
                <div
                  id="recommendation-model-suggestions"
                  role="listbox"
                  aria-label="Matching models"
                  className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-72 overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10"
                >
                  {modelSuggestions.length > 0 ? (
                    modelSuggestions.map((model) => (
                      <button
                        key={model.model}
                        type="button"
                        role="option"
                        aria-selected={activeModel?.model === model.model}
                        onClick={() => {
                          setSelectedModel(model.model);
                          setModelQuery("");
                        }}
                        className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {model.model}
                        </span>
                        <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                          {model.count.toLocaleString()} records
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-2.5 py-3 text-xs text-muted-foreground">
                      No matching model in {activeGroup?.group}.
                    </p>
                  )}
                  {visibleModels.length > modelSuggestions.length ? (
                    <p className="border-t border-border/70 px-2.5 py-2 text-[10px] text-muted-foreground">
                      Keep typing to narrow {visibleModels.length.toLocaleString()} matches.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Selected model
            </label>
            <Select
              value={activeModel?.model ?? undefined}
              disabled={!activeGroup || activeGroup.allModels.length === 0}
              onValueChange={(value) => value && setSelectedModel(value)}
            >
              <SelectTrigger className="w-full" aria-label="Select model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {activeGroup?.allModels.map((model) => (
                  <SelectItem key={model.model} value={model.model}>
                    <span className="min-w-0 flex-1 truncate">
                      {model.model}
                    </span>
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {model.count.toLocaleString()} records
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!columnsAvailable ? (
        <MissingDataCard message="Map the Equipment group, Model, Company, and Status columns to use repair recommendations." />
      ) : relations.length === 0 ? (
        <MissingDataCard message="No equipment models were found in the current dataset." />
      ) : recommendation ? (
        <CompanyRecommendationCard analysis={recommendation} />
      ) : (
        <MissingDataCard message="Select a model with matching repair records to see a recommendation." />
      )}
    </div>
  );
}

function MissingDataCard({ message }: { message: string }) {
  return (
    <Card className="mt-4 rounded-xl border border-border/80 py-8 shadow-xs">
      <CardContent className="flex flex-col items-center px-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <CircleAlert className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-3 font-heading text-base font-semibold">
          Recommendation unavailable
        </p>
        <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">
          {message}
        </p>
      </CardContent>
    </Card>
  );
}
