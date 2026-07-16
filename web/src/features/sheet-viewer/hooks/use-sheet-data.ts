"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchSheetCsv, type SheetData } from "@/lib/google-sheet/fetch-sheet";
import type { SheetRef } from "@/lib/google-sheet/parse-sheet-url";

/** Loads and caches the CSV contents of a public Google Sheet tab. */
export function useSheetData(ref: SheetRef | null) {
  return useQuery<SheetData, Error>({
    queryKey: ["google-sheet", ref?.sheetId ?? "", ref?.gid ?? ""],
    queryFn: () => {
      if (!ref) throw new Error("No sheet selected.");
      return fetchSheetCsv(ref);
    },
    enabled: ref !== null,
    retry: 1,
    staleTime: 60_000,
  });
}
