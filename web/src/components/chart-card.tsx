import { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  /** Fixed pixel height for the chart body. */
  height?: number;
  /** Small caveat line under the title, e.g. data coverage. */
  subtitle?: string;
}

/** Quiet, consistent surface for a single operational chart. */
export function ChartCard({
  title,
  children,
  height = 240,
  subtitle,
}: ChartCardProps) {
  return (
    <Card className="gap-4 rounded-xl border border-border/80 px-5 py-5 shadow-xs ring-0 sm:px-6">
      <CardHeader className="px-0">
        <CardTitle className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
          {title}
        </CardTitle>
        {subtitle ? (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{subtitle}</p>
        ) : null}
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

/** Section title with a restrained brand marker and clear hierarchy. */
export function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="h-4 w-1 rounded-full brand-gradient" aria-hidden="true" />
      <h2 className="font-heading text-[17px] font-semibold tracking-tight text-foreground">
        {children}
      </h2>
    </div>
  );
}
