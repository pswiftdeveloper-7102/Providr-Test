"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Brain,
  Building2,
  CalendarClock,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileBarChart,
  FileDown,
  FileText,
  HeartPulse,
  Home,
  type LucideIcon,
  MessageCircle,
  PalmtreeIcon,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { PortalKey } from "@/lib/portal";

type ProviderModule = "incident" | "rostering";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * If true, only show this nav item to manager-role users — support
   * workers don't get the link.
   */
  managerOnly?: boolean;
};

// Per the 2026-05-12 client spec, the Provider sidebar is split into
// two modules. The switcher at the top of the sidebar selects which
// menu is visible. The header + main content area don't change.
const PROVIDER_INCIDENT_NAV: NavItem[] = [
  { href: "/provider", label: "Overview", icon: Home, managerOnly: true },
  { href: "/provider/incidents", label: "Incidents", icon: ShieldAlert },
  {
    href: "/provider/behaviour-insights",
    label: "Behaviour Insights",
    icon: Brain,
    managerOnly: true,
  },
  {
    href: "/provider/care-plans",
    label: "Care Plans",
    icon: HeartPulse,
    managerOnly: true,
  },
  {
    href: "/provider/compliance-contact",
    label: "Alerts",
    icon: Bell,
    managerOnly: true,
  },
  {
    href: "/provider/reviews",
    label: "Reviews",
    icon: ClipboardCheck,
    managerOnly: true,
  },
  {
    href: "/provider/reports",
    label: "Reports",
    icon: FileBarChart,
    managerOnly: true,
  },
  {
    href: "/provider/audit-pack",
    label: "Audit Readiness",
    icon: ShieldCheck,
    managerOnly: true,
  },
];

const PROVIDER_ROSTERING_NAV: NavItem[] = [
  { href: "/provider", label: "Overview", icon: Home, managerOnly: true },
  { href: "/provider/roster", label: "Roster", icon: CalendarClock },
  { href: "/provider/shifts", label: "Shifts", icon: ClipboardList },
  {
    href: "/provider/availability",
    label: "Availability",
    icon: CalendarRange,
    managerOnly: true,
  },
  {
    href: "/provider/timesheets",
    label: "Timesheets",
    icon: Clock,
    managerOnly: true,
  },
  {
    href: "/provider/leave",
    label: "Leave",
    icon: PalmtreeIcon,
    managerOnly: true,
  },
  {
    href: "/provider/reports",
    label: "Reports",
    icon: FileBarChart,
    managerOnly: true,
  },
  {
    href: "/provider/payroll-exports",
    label: "Payroll Exports",
    icon: FileDown,
    managerOnly: true,
  },
  {
    href: "/provider/settings",
    label: "Settings",
    icon: Settings,
    managerOnly: true,
  },
];

// URL prefixes that auto-switch the Provider sidebar into the matching
// module so that direct navigation (e.g. clicking a notification link)
// shows the correct menu.
const ROSTERING_PREFIXES = [
  "/provider/roster",
  "/provider/shifts",
  "/provider/availability",
  "/provider/timesheets",
  "/provider/leave",
  "/provider/payroll-exports",
  "/provider/settings",
  "/provider/workers",
];

const SC_NAV: NavItem[] = [
  { href: "/sc", label: "Overview", icon: Home },
  { href: "/sc/participants", label: "Participants", icon: Users },
  { href: "/sc/providers", label: "Providers", icon: Building2 },
  { href: "/sc/budgets", label: "Budgets", icon: Wallet },
  { href: "/sc/escalations", label: "Escalations", icon: AlertTriangle },
  { href: "/sc/communications", label: "Communications", icon: MessageCircle },
  { href: "/sc/reviews", label: "Reviews", icon: ClipboardCheck },
  { href: "/sc/evidence", label: "Evidence", icon: FileText },
];

const MODULE_TABS: Array<{
  key: ProviderModule;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "incident", label: "Incident Management", icon: ShieldAlert },
  { key: "rostering", label: "Rostering", icon: CalendarClock },
];

const STORAGE_KEY = "providr.provider.module";

type Props = {
  portal: PortalKey;
  isManager: boolean;
};

function getInitialModule(pathname: string): ProviderModule {
  if (ROSTERING_PREFIXES.some((p) => pathname.startsWith(p))) {
    return "rostering";
  }
  return "incident";
}

export function NavSidebar({ portal, isManager }: Props) {
  const pathname = usePathname();

  // SC + worker portals keep the existing flat sidebar — the spec only
  // describes the Provider switcher.
  if (portal === "sc") {
    return <FlatSidebar pathname={pathname} portal={portal} items={SC_NAV} />;
  }
  if (portal === "worker") return null;

  return (
    <ProviderSidebar pathname={pathname} isManager={isManager} />
  );
}

function ProviderSidebar({
  pathname,
  isManager,
}: {
  pathname: string;
  isManager: boolean;
}) {
  const [module, setModule] = useState<ProviderModule>(() =>
    getInitialModule(pathname)
  );

  // Hydrate from localStorage after mount so SSR matches initial render.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "incident" || stored === "rostering") {
      setModule(stored);
    }
  }, []);

  // When the URL changes, auto-switch into the matching module so deep
  // links land on the right menu.
  useEffect(() => {
    const next = getInitialModule(pathname);
    if (ROSTERING_PREFIXES.some((p) => pathname.startsWith(p))) {
      setModule(next);
    }
  }, [pathname]);

  const onPick = (next: ProviderModule) => {
    setModule(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const allItems =
    module === "incident" ? PROVIDER_INCIDENT_NAV : PROVIDER_ROSTERING_NAV;
  const items = isManager
    ? allItems
    : allItems.filter((item) => !item.managerOnly);

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar lg:block">
      <div className="px-3 py-4">
        <ToggleGroup
          aria-label="Switch module"
          value={[module]}
          onValueChange={(vals) => {
            const v = vals[0];
            if (v === "incident" || v === "rostering") onPick(v);
          }}
          spacing={4}
          className="w-full rounded-xl bg-muted p-1"
        >
          {MODULE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <ToggleGroupItem
                key={tab.key}
                value={tab.key}
                aria-label={tab.label}
                className={cn(
                  "flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium",
                  "data-[pressed]:bg-primary/10 data-[pressed]:text-primary",
                  "h-auto"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-center leading-tight">{tab.label}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        <nav className="mt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {module === "incident" ? "Incident Management" : "Rostering"}
          </p>
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/provider"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

function FlatSidebar({
  pathname,
  portal,
  items,
}: {
  pathname: string;
  portal: PortalKey;
  items: NavItem[];
}) {
  return (
    <aside className="hidden w-56 shrink-0 border-r bg-sidebar lg:block">
      <nav className="px-3 py-6">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {portal === "provider" ? "Provider" : "Coordinator"}
        </p>
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === `/${portal}`
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}