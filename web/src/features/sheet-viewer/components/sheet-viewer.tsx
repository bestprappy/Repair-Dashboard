"use client";

import { useState } from "react";

import { ExternalLink, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import { useSheetData } from "../hooks/use-sheet-data";
import {
  parseSheetUrl,
  sheetEditUrl,
  type SheetRef,
} from "@/lib/google-sheet/parse-sheet-url";
import { SheetDataTable } from "./sheet-data-table";

/** Test page: paste a public Google Sheets link and inspect its full contents. */
export function SheetViewer() {
  const [link, setLink] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sheetRef, setSheetRef] = useState<SheetRef | null>(null);

  const query = useSheetData(sheetRef);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseSheetUrl(link);
    if (!parsed) {
      setFormError(
        "That doesn't look like a Google Sheets link. Paste the full URL from your browser's address bar.",
      );
      return;
    }
    setFormError(null);
    setSheetRef(parsed);
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header>
        <h1 className="font-heading text-2xl font-bold">Google Sheet Viewer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test page — paste a Google Sheets link and every row and column of the
          tab is displayed below.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Sheet link</CardTitle>
          <CardDescription>
            The sheet must be shared as “Anyone with the link can view”.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="sheet-link" className="sr-only">
              Google Sheets link
            </label>
            <Input
              id="sheet-link"
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0"
              aria-invalid={formError ? true : undefined}
            />
            <Button type="submit" disabled={query.isFetching}>
              <FileSpreadsheet data-icon="inline-start" />
              {query.isFetching ? "Loading…" : "Load sheet"}
            </Button>
          </form>
          {formError ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {sheetRef && query.isLoading ? (
        <Card aria-busy="true">
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : null}

      {sheetRef && query.isError ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-destructive">
              {query.error.message}
            </p>
            <Button variant="outline" size="sm" onClick={() => query.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {sheetRef && query.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Sheet contents</CardTitle>
            <CardDescription>
              <a
                href={sheetEditUrl(sheetRef)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Open in Google Sheets
                <ExternalLink className="size-3.5" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SheetDataTable
              key={`${sheetRef.sheetId}:${sheetRef.gid}`}
              data={query.data}
            />
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
