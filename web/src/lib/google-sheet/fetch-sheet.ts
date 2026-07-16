import Papa from "papaparse";

import type { SheetRef } from "./parse-sheet-url";

/** Parsed contents of one sheet tab: the raw header row plus every data row. */
export interface SheetData {
  header: string[];
  rows: string[][];
  columnCount: number;
}

/**
 * CSV endpoints for a public sheet, most faithful first. Both send CORS
 * headers, so they are fetchable directly from the browser on a static site.
 */
function csvUrls({ sheetId, gid }: SheetRef): string[] {
  const base = `https://docs.google.com/spreadsheets/d/${sheetId}`;
  return [
    `${base}/export?format=csv&gid=${gid}`,
    `${base}/gviz/tq?tqx=out:csv&gid=${gid}`,
  ];
}

function parseCsv(text: string): SheetData {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  const [header, ...rows] = result.data;

  if (!header || header.length === 0) {
    throw new Error("The sheet tab appears to be empty.");
  }

  const columnCount = rows.reduce(
    (max, row) => Math.max(max, row.length),
    header.length,
  );

  return { header, rows, columnCount };
}

/**
 * Downloads a public Google Sheet tab as CSV and parses it. Tries the export
 * endpoint first and falls back to gviz. Private sheets fail on both: Google
 * answers with a sign-in page or blocks the request via CORS.
 */
export async function fetchSheetCsv(ref: SheetRef): Promise<SheetData> {
  for (const url of csvUrls(ref)) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google responded with status ${response.status}.`);
      }

      const text = await response.text();
      if (text.trimStart().startsWith("<")) {
        throw new Error("Google returned a sign-in page instead of CSV data.");
      }

      return parseCsv(text);
    } catch (error) {
      // The first endpoint can be blocked by Google while the gviz fallback
      // still succeeds, so this is diagnostic noise rather than an app error.
      console.warn("[fetchSheetCsv] endpoint unavailable; trying fallback", {
        url,
        error,
      });
    }
  }

  throw new Error(
    "Could not load the sheet. Make sure link sharing is set to “Anyone with the link can view”.",
  );
}
