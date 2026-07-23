import {
  INSIGHTS_VIEW,
  RECOMMENDATION_VIEW,
  SCORECARD_VIEW,
  SLA_VIEW,
  type DashboardView,
} from "./types";

export const DASHBOARD_ROUTES = {
  home: "/home",
  equipment: "/equipment",
  sla: "/sla",
  recommendations: "/recommendations",
  vendors: "/vendors",
} as const;

export function companyRoute(company: string): string {
  return `/companies/${encodeURIComponent(company)}`;
}

export function viewFromPathname(pathname: string): DashboardView {
  if (pathname === DASHBOARD_ROUTES.equipment) return INSIGHTS_VIEW;
  if (pathname === DASHBOARD_ROUTES.sla) return SLA_VIEW;
  if (pathname === DASHBOARD_ROUTES.recommendations) return RECOMMENDATION_VIEW;
  if (pathname === DASHBOARD_ROUTES.vendors) return SCORECARD_VIEW;

  const companyPrefix = "/companies/";
  if (pathname.startsWith(companyPrefix)) {
    const encodedCompany = pathname.slice(companyPrefix.length).split("/")[0];
    try {
      return decodeURIComponent(encodedCompany);
    } catch {
      return encodedCompany;
    }
  }

  return "all";
}

export function routeForView(view: DashboardView): string {
  if (view === "all") return DASHBOARD_ROUTES.home;
  if (view === INSIGHTS_VIEW) return DASHBOARD_ROUTES.equipment;
  if (view === SLA_VIEW) return DASHBOARD_ROUTES.sla;
  if (view === RECOMMENDATION_VIEW) return DASHBOARD_ROUTES.recommendations;
  if (view === SCORECARD_VIEW) return DASHBOARD_ROUTES.vendors;
  return companyRoute(view);
}
