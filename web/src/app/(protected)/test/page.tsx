import type { Metadata } from "next";

import { SheetViewer } from "@/features/sheet-viewer/components/sheet-viewer";

export const metadata: Metadata = {
  title: "Google Sheet Viewer — Test",
  description: "Paste a Google Sheets link and inspect every row and column it contains.",
};

export default function TestPage() {
  return <SheetViewer />;
}
