"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { PORTAL_LABEL, type PortalKey } from "@/lib/portal";

type Props = {
  active: PortalKey;
  available: PortalKey[];
};

const PORTALS: PortalKey[] = ["provider", "sc"];

export function PortalToggle({ active, available }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Switch portal"
      className="inline-flex rounded-lg border bg-card p-1 shadow-sm"
    >
      {PORTALS.map((portal) => {
        const isActive = portal === active;
        const isAvailable = available.includes(portal);
        const label = PORTAL_LABEL[portal];

        if (!isAvailable) {
          return (
            <span
              key={portal}
              aria-disabled="true"
              title={`${label} portal not enabled for this organisation`}
              className="px-3 py-1.5 text-xs font-medium text-muted-foreground/40 sm:px-4 sm:text-sm"
            >
              {label}
            </span>
          );
        }

        return (
          <Link
            key={portal}
            href={`/${portal}`}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}