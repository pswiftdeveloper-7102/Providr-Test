import { Plus, AlertTriangle, ShieldAlert, FileText, Clock } from "lucide-react";
import Link from "next/link";
import { startOfMonth } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { clockState } from "@/lib/incident-clock";

import { IncidentsTable, type IncidentRow } from "./incidents-table";

export default async function IncidentsListPage() {
  const context = await resolvePortalContext("provider");
  const orgId = context.activeOrg.id;
  const now = new Date();
  const monthStart = startOfMonth(now);

  const [incidents, totalCount, openCount, mtdReportable] = await Promise.all([
    db.incident.findMany({
      where: { orgId },
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
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
  ]);

  // Overdue: REPORTABLE with the 24h clock past deadline and no NDIS
  // submission yet. Computed in JS — same logic as clockState helper.
  const overdueIncidents = await db.incident.findMany({
    where: {
      orgId,
      severity: "REPORTABLE",
      reportedToNdisAt: null,
    },
    select: { id: true, occurredAt: true, reportedAt: true },
  });
  const overdueCount = overdueIncidents.filter((i) => {
    const start = i.reportedAt ?? i.occurredAt;
    return start.getTime() + 24 * 60 * 60 * 1000 < now.getTime();
  }).length;

  const rows: IncidentRow[] = incidents.map((i) => {
    const state = clockState(i, now);
    let triage: IncidentRow["triage"] = "internal";
    if (i.severity === "REPORTABLE") {
      if (state.kind === "overdue-unsubmitted") triage = "overdue";
      else if (state.kind === "pending") triage = "ndis-pending";
      else if (
        state.kind === "submitted-on-time" ||
        state.kind === "submitted-late"
      )
        triage = "ndis-submitted";
    }
    return {
      id: i.id,
      number: `INC-${i.id.slice(-6).toUpperCase()}`,
      type: i.incidentType ?? null,
      severity: i.severity,
      status: i.status,
      participantName: i.participant
        ? `${i.participant.firstName} ${i.participant.lastName}`
        : null,
      triage,
      occurredAt: i.occurredAt.toISOString(),
    };
  });

  const stats = [
    {
      label: "Total Incidents",
      value: totalCount,
      badge: "All time",
      badgeTone: "neutral" as const,
      icon: FileText,
    },
    {
      label: "Open / Under Review",
      value: openCount,
      badge: openCount === 0 ? "All clear" : "Action needed",
      badgeTone: openCount === 0 ? ("good" as const) : ("warn" as const),
      icon: AlertTriangle,
    },
    {
      label: "NDIS Reportable (MTD)",
      value: mtdReportable,
      badge: "This month",
      badgeTone: "neutral" as const,
      icon: ShieldAlert,
    },
    {
      label: "Overdue Notifications",
      value: overdueCount,
      badge: overdueCount === 0 ? "On track" : "Overdue",
      badgeTone: overdueCount === 0 ? ("good" as const) : ("danger" as const),
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage incidents for your company.
          </p>
        </div>
        <Button render={<Link href="/provider/incidents/new" />}>
          <Plus />
          Report Incident
        </Button>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} size="sm">
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {s.label}
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">
                      {s.value}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={
                        s.badgeTone === "danger"
                          ? "destructive"
                          : s.badgeTone === "warn"
                          ? "default"
                          : "outline"
                      }
                      className={
                        s.badgeTone === "good"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : undefined
                      }
                    >
                      {s.badge}
                    </Badge>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <IncidentsTable rows={rows} />
    </div>
  );
}