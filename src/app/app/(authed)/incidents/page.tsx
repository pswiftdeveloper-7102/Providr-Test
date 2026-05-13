import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, Clock, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { clockState } from "@/lib/incident-clock";
import type { IncidentSeverity, IncidentStatus } from "@prisma/client";

import { IncidentsFilter } from "./incidents-filter";

const SEVERITY_VARIANT: Record<
  IncidentSeverity,
  "default" | "secondary" | "outline" | "destructive"
> = {
  MINOR: "outline",
  MODERATE: "secondary",
  SERIOUS: "default",
  REPORTABLE: "destructive",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  DRAFT: "Draft",
  REPORTED: "Reported",
  UNDER_REVIEW: "Under review",
  CLOSED: "Closed",
};

export default async function AppIncidentsListPage() {
  const context = await resolvePortalContext("provider");
  const orgId = context.activeOrg.id;
  const now = new Date();

  const incidents = await db.incident.findMany({
    where: { orgId },
    include: {
      participant: { select: { firstName: true, lastName: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  const rows = incidents.map((i) => {
    const state = clockState(i, now);
    const overdue = state.kind === "overdue-unsubmitted";
    return {
      id: i.id,
      number: `INC-${i.id.slice(-6).toUpperCase()}`,
      severity: i.severity,
      status: i.status,
      participantName: i.participant
        ? `${i.participant.firstName} ${i.participant.lastName}`
        : null,
      occurredAt: i.occurredAt.toISOString(),
      overdue,
    };
  });

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Incidents</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {rows.length} total
          </p>
        </div>
        <Button size="sm" render={<Link href="/app/incidents/new" />}>
          <Plus />
          Report
        </Button>
      </header>

      <IncidentsFilter
        rows={rows}
        labels={{ severity: SEVERITY_VARIANT, status: STATUS_LABEL }}
        renderRow={(r) => (
          <Link
            key={r.id}
            href={`/app/incidents/${r.id}`}
            className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-colors active:bg-muted"
          >
            <div className="flex flex-1 flex-col gap-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-medium text-primary">
                  {r.number}
                </span>
                <Badge
                  variant={SEVERITY_VARIANT[r.severity]}
                  className="text-[10px]"
                >
                  {r.severity.toLowerCase()}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {STATUS_LABEL[r.status]}
                </Badge>
                {r.overdue && (
                  <Badge variant="destructive" className="text-[10px]">
                    overdue
                  </Badge>
                )}
              </div>
              <span className="truncate text-sm font-medium">
                {r.participantName ?? "Unspecified participant"}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {format(new Date(r.occurredAt), "dd/MM/yyyy, h:mm a")}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        )}
        emptyState={
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No incidents match those filters.
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}