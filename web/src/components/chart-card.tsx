import { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  /** Fixed pixel height for the chart body. */
  height?: number;
}

/** Card shell for a single chart with an uppercase title. */
export function ChartCard({ title, children, height = 240 }: ChartCardProps) {
  return (
    <Card className="gap-3 rounded-2xl px-5 py-4 shadow-sm ring-foreground/5">
      <CardHeader className="px-0">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0" style={{ height }}>
        {children}
      </CardContent>
    </Card>
  );
}

interface SectionHeadingProps {
  children: ReactNode;
}

/** Uppercase section divider with a trailing rule. */
export function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h3 className="whitespace-nowrap font-heading text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {children}
      </h3>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
