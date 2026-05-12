import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  type LucideIcon,
  Network,
  ShieldAlert,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PortalKey } from "@/lib/portal";

type Tab = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

// Two top-level entry points the client asked to surface on each
// portal's dashboard. The sidebar still owns the full nav — these are
// quick-access cards for the two highest-frequency surfaces.
const TABS: Record<PortalKey, Tab[]> = {
  provider: [
    {
      href: "/provider/incidents",
      label: "Incident Management",
      description:
        "Log, track, and submit reportable incidents. NDIS 24-hour clock built in.",
      icon: ShieldAlert,
    },
    {
      href: "/provider/roster",
      label: "Rostering",
      description:
        "Match workers to participants, check certs, manage today's shifts.",
      icon: CalendarClock,
    },
  ],
  sc: [
    {
      href: "/sc/escalations",
      label: "Incident Management",
      description:
        "Open escalations across your participants — provider drops, hospital, plan breaches.",
      icon: ShieldAlert,
    },
    {
      href: "/sc/participants",
      label: "Coordination",
      description:
        "Manage participants, plans, engaged providers, and budget utilisation.",
      icon: Network,
    },
  ],
  // Worker portal doesn't surface these — it has its own mobile shell.
  worker: [],
};

export function ModuleTabs({ portal }: { portal: PortalKey }) {
  const tabs = TABS[portal];
  if (tabs.length === 0) return null;
  return (
    <section
      aria-label="Quick access"
      className="grid gap-3 sm:grid-cols-2"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} className="block">
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle>{t.label}</CardTitle>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardDescription className="mt-1">
                      {t.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        );
      })}
    </section>
  );
}