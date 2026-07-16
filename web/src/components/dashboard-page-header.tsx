import { CalendarDays } from "lucide-react";

interface DashboardPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  months?: string[];
  meta?: string;
}

function monthRange(months: string[]): string | null {
  if (months.length === 0) return null;

  const format = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return value;
    return new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(year, month - 1, 1)));
  };

  const first = format(months[0]);
  const last = format(months[months.length - 1]);
  return first === last ? first : `${first} – ${last}`;
}

/** Consistent page title and real-data context for dashboard views. */
export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  months = [],
  meta,
}: DashboardPageHeaderProps) {
  const range = monthRange(months);

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-1.5 text-xs font-semibold text-primary">{eyebrow}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {range || meta ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {range ? (
            <span className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 font-medium shadow-xs">
              <CalendarDays className="size-3.5 text-primary" />
              {range}
            </span>
          ) : null}
          {meta ? (
            <span className="inline-flex h-9 items-center rounded-lg border bg-card px-3 font-medium shadow-xs">
              {meta}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
