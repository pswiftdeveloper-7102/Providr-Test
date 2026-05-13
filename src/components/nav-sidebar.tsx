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
  Network,
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

type ModuleTab<K extends string> = {
  key: K;
  label: string;
  icon: LucideIcon;
};

type ModuleConfig<K extends string> = {
  // Storage key for localStorage so each portal persists its own state.
  storageKey: string;
  // Path the "Overview" link points to — used to handle the special-case
  // where overview matches its href exactly, not by prefix.
  rootHref: string;
  // The two tabs in the segmented control.
  tabs: ModuleTab<K>[];
  // The nav items shown when each tab is active.
  itemsByModule: Record<K, NavItem[]>;
  // Pathname prefixes that auto-switch the sidebar into the matching
  // module on direct navigation (e.g. clicking a notification link).
  autoSwitchByModule: Record<K, string[]>;
  // Default module if pathname doesn't match any autoSwitchByModule entry.
  defaultModule: K;
};

// ────────── Provider config ──────────

type ProviderModule = "incident" | "rostering";

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

const PROVIDER_CONFIG: ModuleConfig<ProviderModule> = {
  storageKey: "providr.provider.module",
  rootHref: "/provider",
  tabs: [
    { key: "incident", label: "Incident Logging", icon: ShieldAlert },
    { key: "rostering", label: "Rostering", icon: CalendarClock },
  ],
  itemsByModule: {
    incident: PROVIDER_INCIDENT_NAV,
    rostering: PROVIDER_ROSTERING_NAV,
  },
  autoSwitchByModule: {
    incident: [
      "/provider/incidents",
      "/provider/behaviour-insights",
      "/provider/care-plans",
      "/provider/compliance-contact",
      "/provider/reviews",
      "/provider/audit-pack",
    ],
    rostering: [
      "/provider/roster",
      "/provider/shifts",
      "/provider/availability",
      "/provider/timesheets",
      "/provider/leave",
      "/provider/payroll-exports",
      "/provider/settings",
      "/provider/workers",
    ],
  },
  defaultModule: "incident",
};

// ────────── SC config ──────────

type ScModule = "incident" | "coordination";

const SC_INCIDENT_NAV: NavItem[] = [
  { href: "/sc", label: "Overview", icon: Home },
  { href: "/sc/escalations", label: "Escalations", icon: AlertTriangle },
  {
    href: "/sc/communications",
    label: "Communications",
    icon: MessageCircle,
  },
  { href: "/sc/reviews", label: "Reviews", icon: ClipboardCheck },
  { href: "/sc/evidence", label: "Evidence", icon: FileText },
];

const SC_COORDINATION_NAV: NavItem[] = [
  { href: "/sc", label: "Overview", icon: Home },
  { href: "/sc/participants", label: "Participants", icon: Users },
  { href: "/sc/providers", label: "Providers", icon: Building2 },
  { href: "/sc/budgets", label: "Budgets", icon: Wallet },
];

const SC_CONFIG: ModuleConfig<ScModule> = {
  storageKey: "providr.sc.module",
  rootHref: "/sc",
  // SC doesn't roster delivery workers, so the second tab is
  // "Coordination" — covers their day-to-day participant + provider
  // management work.
  tabs: [
    { key: "incident", label: "Incident Logging", icon: ShieldAlert },
    { key: "coordination", label: "Coordination", icon: Network },
  ],
  itemsByModule: {
    incident: SC_INCIDENT_NAV,
    coordination: SC_COORDINATION_NAV,
  },
  autoSwitchByModule: {
    incident: [
      "/sc/escalations",
      "/sc/communications",
      "/sc/reviews",
      "/sc/evidence",
    ],
    coordination: [
      "/sc/participants",
      "/sc/providers",
      "/sc/budgets",
    ],
  },
  defaultModule: "incident",
};

// ────────── Dispatcher ──────────

type Props = {
  portal: PortalKey;
  isManager: boolean;
};

export function NavSidebar({ portal, isManager }: Props) {
  const pathname = usePathname();

  if (portal === "worker") return null;
  if (portal === "provider") {
    return (
      <ModuleSidebar
        pathname={pathname}
        isManager={isManager}
        config={PROVIDER_CONFIG}
      />
    );
  }
  return (
    <ModuleSidebar
      pathname={pathname}
      isManager={isManager}
      config={SC_CONFIG}
    />
  );
}

// ────────── Generic sidebar with module switcher ──────────

function ModuleSidebar<K extends string>({
  pathname,
  isManager,
  config,
}: {
  pathname: string;
  isManager: boolean;
  config: ModuleConfig<K>;
}) {
  const getModuleForPath = (path: string): K => {
    for (const tab of config.tabs) {
      const prefixes = config.autoSwitchByModule[tab.key];
      if (prefixes.some((p) => path.startsWith(p))) return tab.key;
    }
    return config.defaultModule;
  };

  const [module, setModule] = useState<K>(() => getModuleForPath(pathname));

  // Hydrate from localStorage after mount so SSR matches initial render.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(config.storageKey);
    if (stored && config.tabs.some((t) => t.key === stored)) {
      setModule(stored as K);
    }
  }, [config.storageKey, config.tabs]);

  // When the URL changes, auto-switch into the matching module so deep
  // links land on the right menu. Only fire if the path actually maps
  // to a non-default module — keeps the user's manual choice if they
  // navigate to a neutral page (e.g. Overview).
  useEffect(() => {
    for (const tab of config.tabs) {
      const prefixes = config.autoSwitchByModule[tab.key];
      if (prefixes.some((p) => pathname.startsWith(p))) {
        setModule(tab.key);
        return;
      }
    }
  }, [pathname, config.tabs, config.autoSwitchByModule]);

  const onPick = (next: K) => {
    setModule(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(config.storageKey, next);
    }
  };

  const activeTab = config.tabs.find((t) => t.key === module);
  const allItems = config.itemsByModule[module];
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
            if (config.tabs.some((t) => t.key === v)) onPick(v as K);
          }}
          spacing={4}
          className="w-full rounded-xl bg-muted/70 p-1"
        >
          {config.tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === module;
            return (
              <ToggleGroupItem
                key={tab.key}
                value={tab.key}
                aria-label={tab.label}
                className={cn(
                  "flex-1 h-auto flex-col items-center gap-1.5 rounded-lg px-2 py-2.5 text-[11px] font-medium transition-all duration-200",
                  isActive
                    ? "!bg-background !text-foreground shadow-sm ring-1 ring-border/60"
                    : "!bg-transparent text-muted-foreground hover:!bg-background/40 hover:!text-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-transparent text-muted-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="text-center leading-tight">{tab.label}</span>
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>

        <nav className="mt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {activeTab?.label}
          </p>
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === config.rootHref
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