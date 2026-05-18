import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { isSupportWorkerOnly } from "@/lib/rbac";
import { clockState } from "@/lib/incident-clock";
import { PageNav } from "@/components/page-nav";

import { IncidentsFilter, type IncidentRowLite } from "./incidents-filter";

const PER_PAGE = 25;

export default async function AppIncidentsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const context = await resolvePortalContext("provider");
  const orgId = context.activeOrg.id;
  const now = new Date();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  // Support-worker-only users only see incidents for participants
  // they've been granted access to via WorkerParticipant. Managers
  // see every incident in the org.
  let participantIdFilter: { in: string[] } | undefined;
  if (isSupportWorkerOnly(context)) {
    const worker = await db.worker.findFirst({
      where: { userId: context.user.id, orgId },
      select: {
        participantAccess: { select: { participantId: true } },
      },
    });
    const ids = worker?.participantAccess.map((wp) => wp.participantId) ?? [];
    participantIdFilter = { in: ids };
  }

  const where = {
    orgId,
    ...(participantIdFilter ? { participantId: participantIdFilter } : {}),
  };
  const [incidents, total] = await Promise.all([
    db.incident.findMany({
      where,
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.incident.count({ where }),
  ]);

  const rows: IncidentRowLite[] = incidents.map((i) => {
    const state = clockState(i, now);
    return {
      id: i.id,
      number: `INC-${i.id.slice(-6).toUpperCase()}`,
      severity: i.severity,
      status: i.status,
      participantName: i.participant
        ? `${i.participant.firstName} ${i.participant.lastName}`
        : null,
      occurredAt: i.occurredAt.toISOString(),
      overdue: state.kind === "overdue-unsubmitted",
    };
  });

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Incidents</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {total} total
          </p>
        </div>
        <Button size="sm" render={<Link href="/app/incidents/new" />}>
          <Plus />
          Report
        </Button>
      </header>

      <IncidentsFilter rows={rows} />

      <PageNav page={page} perPage={PER_PAGE} total={total} />
    </div>
  );
}