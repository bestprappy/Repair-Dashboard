import {
  parseSheetUrl,
  type SheetRef,
} from "@/lib/google-sheet/parse-sheet-url";

/**
 * The Google Sheet configured for live loading, or null when the env var is
 * unset or unparseable (the dashboard then falls back to CSV upload).
 * NEXT_PUBLIC_ values are inlined at build time.
 */
export const LIVE_SHEET_REF: SheetRef | null = parseSheetUrl(
  process.env.NEXT_PUBLIC_SHEET_URL ?? "",
);

/** How often the dashboard re-pulls the sheet while open. */
export const LIVE_REFRESH_MS = 60_000;
