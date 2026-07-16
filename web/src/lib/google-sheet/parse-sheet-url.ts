/** Reference to a specific tab of a Google Spreadsheet. */
export interface SheetRef {
  sheetId: string;
  gid: string;
}

const SHEET_ID_PATTERN = /\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)/;
const GID_PATTERN = /[?&#]gid=(\d+)/;

/**
 * Extracts the spreadsheet id and tab gid from a pasted Google Sheets URL.
 * Returns null when the input is not a recognizable Google Sheets link.
 */
export function parseSheetUrl(input: string): SheetRef | null {
  const trimmed = input.trim();
  const idMatch = SHEET_ID_PATTERN.exec(trimmed);
  if (!idMatch) return null;

  const gidMatch = GID_PATTERN.exec(trimmed);
  return { sheetId: idMatch[1], gid: gidMatch?.[1] ?? "0" };
}

/** Canonical URL for opening the sheet tab in Google Sheets. */
export function sheetEditUrl({ sheetId, gid }: SheetRef): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}`;
}
