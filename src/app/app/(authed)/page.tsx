import Link from "next/link";
import { format, startOfMonth } from "date-fns";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { clockState } from "@/lib/incident-clock";

const SEVERITY_VARIANT = {
  MINOR: "outline",
  MODERATE: "secondary",
  SERIOUS: "default",
  REPORTABLE: "destructive",
} as const;

export default async function AppHomePage() {
  const context = await resolvePortalContext("provider");
  const orgId = context.activeOrg.id;
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [totalCount, openCount, mtdReportable, recent] = await Promise.all([
    db.incident.count({ where: { orgId } }),
    db.incident.count({
      where: {
        orgId,
        status: { in: ["DRAFT", "REPORTED", "UNDER_REVIEW"] },
      },
    }),
    db.incident.count({
      where: {
        orgId,
        severity: "REPORTABLE",
        reportedAt: { gte: monthStart },
      },
    }),
    db.incident.findMany({
      where: { orgId },
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
  ]);

  const firstName = context.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          Hi, {firstName}.
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Log and track incidents from the field.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2">
        <MiniStat
          icon={FileText}
          label="Total"
          value={totalCount}
          tone="neutral"
        />
        <MiniStat
          icon={AlertTriangle}
          label="Open"
          value={openCount}
          tone={openCount > 0 ? "warn" : "good"}
        />
        <MiniStat
          icon={ShieldAlert}
          label="Reportable (MTD)"
          value={mtdReportable}
          tone={mtdReportable > 0 ? "warn" : "neutral"}
        />
      </section>

      <Button
        size="lg"
        className="w-full"
        render={<Link href="/app/incidents/new" />}
      >
        <Plus />
        Report an incident
      </Button>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent incidents
          </h2>
          <Link
            href="/app/incidents"
            className="text-xs font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No incidents on file yet. Hit Report when you need to log one.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-2">
            {recent.map((i) => {
              const state = clockState(i, now);
              const overdue = state.kind === "overdue-unsubmitted";
              return (
                <li key={i.id}>
                  <Link
                    href={`/app/incidents/${i.id}`}
                    className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-colors active:bg-muted"
                  >
                    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={SEVERITY_VARIANT[i.severity]}
                          className="text-[10px]"
                        >
                          {i.severity.toLowerCase()}
                        </Badge>
                        <span className="truncate text-sm font-medium">
                          {i.participant
                            ? `${i.participant.firstName} ${i.participant.lastName}`
                            : "Unspecified participant"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {format(i.occurredAt, "dd MMM, h:mm a")}
                        {overdue && (
                          <span className="ml-1 font-medium text-destructive">
                            · overdue
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  tone: "neutral" | "good" | "warn";
}) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-md ${
              tone === "warn"
                ? "bg-amber-100 text-amber-700"
                : tone === "good"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
        </div>
        <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}