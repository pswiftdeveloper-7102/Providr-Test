import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

// SC Job 6 — build evidence. This is the index page that lists every
// active participant; clicking through opens their evidence pack built
// from the year's records.

export default async function SCEvidencePage() {
  const context = await resolvePortalContext("sc");
  const now = new Date();

  const participants = await db.participant.findMany({
    where: { orgId: context.activeOrg.id },
    include: {
      plans: {
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        take: 1,
      },
      _count: {
        select: { engagements: true, escalations: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Evidence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SC Job 6 — build the annual evidence pack for the plan review. Pick
          a participant to assemble theirs.
        </p>
      </header>

      {participants.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Nothing to assemble yet</CardTitle>
                <CardDescription>
                  Add participants and capture plans to build evidence
                  packs.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {participants.map((p) => {
                const plan = p.plans[0];
                const days = plan
                  ? differenceInCalendarDays(plan.endDate, now)
                  : null;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/sc/participants/${p.id}/evidence`}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {plan
                            ? `Plan ends ${format(plan.endDate, "d MMM yyyy")}`
                            : "No active plan"}
                          {" · "}
                          {p._count.engagements} engagement
                          {p._count.engagements === 1 ? "" : "s"} ·{" "}
                          {p._count.escalations} escalation
                          {p._count.escalations === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {days !== null && days <= 90 && days >= 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            review in {days}d
                          </Badge>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}