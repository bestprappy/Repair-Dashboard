"use client";

import { useAtom } from "jotai";

import { cn } from "@/lib/utils";

import type { CompanyNavItem } from "../lib/selectors";
import { viewAtom } from "../state/atoms";

interface DashboardSidebarProps {
  grandTotal: number;
  companies: CompanyNavItem[];
}

/** Left nav: "All Companies" overview plus a per-company list. */
export function DashboardSidebar({ grandTotal, companies }: DashboardSidebarProps) {
  const [view, setView] = useAtom(viewAtom);

  return (
    <aside className="sticky top-[62px] hidden h-[calc(100vh-62px)] w-56 shrink-0 overflow-y-auto border-r border-border bg-card py-5 md:block">
      <SidebarLabel>Overview</SidebarLabel>
      <SidebarTab
        name="All Companies"
        count={grandTotal}
        active={view === "all"}
        onSelect={() => setView("all")}
      />

      <SidebarLabel className="mt-4">Companies</SidebarLabel>
      {companies.map((company) => (
        <SidebarTab
          key={company.company}
          name={company.company}
          count={company.count}
          active={view === company.company}
          onSelect={() => setView(company.company)}
        />
      ))}
    </aside>
  );
}

function SidebarLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "mb-2 px-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface SidebarTabProps {
  name: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}

function SidebarTab({ name, count, active, onSelect }: SidebarTabProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 border-l-2 px-4 py-2 text-left text-[13px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          active ? "bg-primary" : "bg-muted-foreground/40",
        )}
      />
      <span className="truncate">{name}</span>
      <span
        className={cn(
          "ml-auto shrink-0 font-mono text-[11px]",
          active ? "text-primary" : "text-muted-foreground/70",
        )}
      >
        {count.toLocaleString()}
      </span>
    </button>
  );
}
