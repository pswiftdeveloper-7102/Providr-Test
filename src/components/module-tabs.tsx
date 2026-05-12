"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, type LucideIcon, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PortalKey } from "@/lib/portal";

type Tab = {
  key: "incident" | "rostering";
  href: string;
  label: string;
  icon: LucideIcon;
  match: string[];
};

const TABS: Record<PortalKey, Tab[]> = {
  provider: [
    {
      key: "incident",
      href: "/provider/incidents",
      label: "Incident Management",
      icon: ShieldAlert,
      match: ["/provider/incidents"],
    },
    {
      key: "rostering",
      href: "/provider/roster",
      label: "Rostering",
      icon: CalendarDays,
      match: ["/provider/roster", "/provider/shifts"],
    },
  ],
  sc: [
    {
      key: "incident",
      href: "/sc/escalations",
      label: "Incident Management",
      icon: ShieldAlert,
      match: ["/sc/escalations"],
    },
    {
      key: "rostering",
      href: "/sc/participants",
      label: "Coordination",
      icon: CalendarDays,
      match: ["/sc/participants", "/sc/providers"],
    },
  ],
  worker: [],
};

export function ModuleTabs({ portal }: { portal: PortalKey }) {
  const pathname = usePathname();
  const tabs = TABS[portal];
  if (tabs.length === 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Quick access"
      className="inline-flex rounded-xl border bg-card p-1 shadow-sm"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex min-w-[120px] flex-col items-center gap-1 rounded-lg px-5 py-2 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-center leading-tight">{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}