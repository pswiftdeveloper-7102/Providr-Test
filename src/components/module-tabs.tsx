"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { PortalKey } from "@/lib/portal";

type Tab = {
  key: "incident" | "rostering";
  href: string;
  label: string;
  // URL prefixes that mark this tab as "active". The dashboard itself
  // doesn't match any prefix, so neither tab is selected there.
  match: string[];
};

const TABS: Record<PortalKey, Tab[]> = {
  provider: [
    {
      key: "incident",
      href: "/provider/incidents",
      label: "Incident Management",
      match: ["/provider/incidents"],
    },
    {
      key: "rostering",
      href: "/provider/roster",
      label: "Rostering",
      match: ["/provider/roster", "/provider/shifts"],
    },
  ],
  sc: [
    {
      key: "incident",
      href: "/sc/escalations",
      label: "Incident Management",
      match: ["/sc/escalations"],
    },
    {
      key: "rostering",
      href: "/sc/participants",
      label: "Coordination",
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
      className="inline-flex rounded-lg border bg-card p-1 shadow-sm"
    >
      {tabs.map((tab) => {
        const isActive = tab.match.some((m) => pathname.startsWith(m));
        return (
          <Link
            key={tab.key}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}