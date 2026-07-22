"use client";

import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Building2,
  Database,
  LayoutDashboard,
  Route,
  Timer,
} from "lucide-react";
import { useAtom } from "jotai";

import { cn } from "@/lib/utils";

import type { CompanyNavItem } from "../lib/selectors";
import {
  INSIGHTS_VIEW,
  RECOMMENDATION_VIEW,
  SLA_VIEW,
} from "../lib/types";
import { viewAtom } from "../state/atoms";

interface DashboardSidebarProps {
  grandTotal: number;
  companies: CompanyNavItem[];
}

/** Desktop navigation for overview, vendor drill-downs, and equipment analysis. */
export function DashboardSidebar({ grandTotal, companies }: DashboardSidebarProps) {
  const [view, setView] = useAtom(viewAtom);

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col border-r border-border/80 bg-sidebar lg:flex">
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <SidebarLabel>Workspace</SidebarLabel>
        <SidebarTab
          name="Overview"
          count={grandTotal}
          icon={LayoutDashboard}
          active={view === "all"}
          onSelect={() => setView("all")}
        />

        <SidebarLabel className="mt-6">Companies</SidebarLabel>
        <div className="space-y-0.5">
          {companies.map((company) => (
            <SidebarTab
              key={company.company}
              name={company.company}
              count={company.count}
              icon={Building2}
              active={view === company.company}
              onSelect={() => setView(company.company)}
            />
          ))}
        </div>

        <SidebarLabel className="mt-6">Analysis</SidebarLabel>
        <SidebarTab
          name="SLA & Overdue"
          icon={Timer}
          active={view === SLA_VIEW}
          onSelect={() => setView(SLA_VIEW)}
        />
        <SidebarTab
          name="Repair recommendation"
          icon={Route}
          active={view === RECOMMENDATION_VIEW}
          onSelect={() => setView(RECOMMENDATION_VIEW)}
        />
        <SidebarTab
          name="Equipment & models"
          icon={Boxes}
          active={view === INSIGHTS_VIEW}
          onSelect={() => setView(INSIGHTS_VIEW)}
        />
      </nav>

      <div className="border-t border-border/80 p-3">
        <div className="rounded-xl border border-border/80 bg-muted/45 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="size-3.5" />
            </span>
            Active dataset
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            {grandTotal.toLocaleString()} repair records across {companies.length} companies
          </p>
        </div>
      </div>
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
        "mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface SidebarTabProps {
  name: string;
  count?: number;
  icon: LucideIcon;
  active: boolean;
  onSelect: () => void;
}

function SidebarTab({ name, count, icon: Icon, active, onSelect }: SidebarTabProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-muted/65 hover:text-foreground",
      )}
    >
      {active ? (
        <span className="brand-gradient absolute inset-y-2 left-0 w-0.5 rounded-full" />
      ) : null}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground/75 group-hover:text-foreground",
        )}
        strokeWidth={1.8}
      />
      <span className="truncate">{name}</span>
      {count != null ? (
        <span
          className={cn(
            "ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
            active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {count.toLocaleString()}
        </span>
      ) : null}
    </button>
  );
}
