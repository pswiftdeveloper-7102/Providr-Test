"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  type LucideIcon,
  Building2,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  HardHat,
  HeartPulse,
  Home,
  MessageCircle,
  ShieldAlert,
  Users,
  Wallet,
  FileText,
  AlertTriangle,
} from "lucide-react";

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

const PROVIDER_NAV: NavItem[] = [
  { href: "/provider", label: "Overview", icon: Home, managerOnly: true },
  { href: "/provider/participants", label: "Participants", icon: Users },
  { href: "/provider/workers", label: "Workers", icon: HardHat, managerOnly: true },
  { href: "/provider/roster", label: "Roster", icon: CalendarClock },
  { href: "/provider/shifts", label: "Shifts", icon: ClipboardList },
  { href: "/provider/incidents", label: "Incidents", icon: ShieldAlert },
  { href: "/provider/care-plans", label: "Care plans", icon: HeartPulse },
  { href: "/provider/reviews", label: "Reviews", icon: ClipboardCheck, managerOnly: true },
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

type Props = {
  portal: PortalKey;
  isManager: boolean;
};

export function NavSidebar({ portal, isManager }: Props) {
  const pathname = usePathname();
  const allItems = portal === "provider" ? PROVIDER_NAV : SC_NAV;
  const items = isManager
    ? allItems
    : allItems.filter((item) => !item.managerOnly);

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
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
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