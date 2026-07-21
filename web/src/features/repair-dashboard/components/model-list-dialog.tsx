"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import type { GroupModelDatum } from "../lib/insights";

interface ModelListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: string;
  /** Every model for the group, already ranked by repair-record count. */
  models: GroupModelDatum[];
  selectedModel: string | null;
  onSelectModel: (model: string) => void;
}

/** Full, searchable model list for a group, beyond the top-10 preview. */
export function ModelListDialog({
  open,
  onOpenChange,
  group,
  models,
  selectedModel,
  onSelectModel,
}: ModelListDialogProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return models;
    return models.filter((model) =>
      model.model.toLowerCase().includes(needle),
    );
  }, [models, deferredQuery]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <DialogContent className="max-w-2xl gap-4 p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>All models in {group}</DialogTitle>
          <DialogDescription>
            {models.length.toLocaleString()} distinct models, ranked by
            repair-record count. Select a row to view its company evidence.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6">
          <label htmlFor="all-models-search" className="sr-only">
            Search models
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="all-models-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto border-t border-border/80">
          {filtered.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              No models match “{query}”.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-muted/60 backdrop-blur hover:bg-muted/60">
                  <TableHead className="pl-6">Model</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                  <TableHead className="pr-6 text-right">
                    PASS rate (completed)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((model, index) => {
                  const selected = selectedModel === model.model;
                  return (
                    <TableRow
                      key={model.model}
                      data-state={selected ? "selected" : undefined}
                    >
                      <TableCell className="max-w-64 pl-6 font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            onSelectModel(model.model);
                            onOpenChange(false);
                          }}
                          aria-pressed={selected}
                          className="flex w-full items-center gap-2.5 text-left outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/8 text-[10px] font-semibold tabular-nums text-primary",
                              selected && "bg-primary text-primary-foreground",
                            )}
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0 truncate" title={model.model}>
                            {model.model}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {model.count.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {model.sharePct.toFixed(1)}%
                      </TableCell>
                      <TableCell className="pr-6 text-right">
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
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
