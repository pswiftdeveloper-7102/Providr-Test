import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  Sparkles,
  Timer,
} from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

// SC Scene D — the yearly cycle. Three phases of an SC's year against
// each participant's plan: setup (months 1-2), ops (3-10), evidence +
// review (11-12). This page surfaces what each phase needs you to do
// right now across the whole caseload.

const HORIZON_DAYS = 120;

type Phase = "setup" | "ops" | "review";

export default async function SCReviewsPage() {
  const context = await resolvePortalContext("sc");
  const now = new Date();

  const plans = await db.plan.findMany({
    where: {
      participant: { orgId: context.activeOrg.id },
      status: { in: ["ACTIVE", "DRAFT"] },
    },
    include: {
      participant: { select: { id: true, firstName: true, lastName: true } },
      budgets: true,
    },
    orderBy: { endDate: "asc" },
  });

  type Row = {
    planId: string;
    participantId: string;
    participantName: string;
    startDate: Date;
    endDate: Date;
    daysIn: number;
    daysToEnd: number;
    totalDays: number;
    phase: Phase;
    pctElapsed: number;
  };

  const rows: Row[] = plans.map((p) => {
    const totalDays = Math.max(
      1,
      differenceInCalendarDays(p.endDate, p.startDate)
    );
    const daysIn = Math.max(
      0,
      differenceInCalendarDays(now, p.startDate)
    );
    const daysToEnd = differenceInCalendarDays(p.endDate, now);
    const pctElapsed = (daysIn / totalDays) * 100;

    let phase: Phase = "ops";
    if (daysIn <= 60) phase = "setup";
    else if (daysToEnd <= 60) phase = "review";

    return {
      planId: p.id,
      participantId: p.participant.id,
      participantName: `${p.participant.firstName} ${p.participant.lastName}`,
      startDate: p.startDate,
      endDate: p.endDate,
      daysIn,
      daysToEnd,
      totalDays,
      phase,
      pctElapsed,
    };
  });

  const setup = rows.filter((r) => r.phase === "setup");
  const ops = rows.filter((r) => r.phase === "ops");
  const review = rows
    .filter((r) => r.phase === "review")
    .filter((r) => r.daysToEnd <= HORIZON_DAYS);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Yearly cycle
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SC Scene D — every plan moves through setup → ops → review. This
          page surfaces what each phase needs you to do across your caseload.
        </p>
      </header>

      <PhaseSection
        title="Setting up"
        subtitle="Plans in their first two months. Decode the plan, find providers, schedule the first shifts."
        icon={Sparkles}
        rows={setup}
        emptyMessage="No plans currently in setup."
        action="Setup checklist"
        now={now}
      />

      <PhaseSection
        title="Operating"
        subtitle="The steady-state middle. Track spend monthly, quarterly home visits, handle whatever comes."
        icon={Timer}
        rows={ops}
        emptyMessage="No plans in steady ops."
        action="Open participant"
        now={now}
      />

      <PhaseSection
        title="Reviewing"
        subtitle="Last two months — assemble the evidence and prep for the NDIA meeting."
        icon={ClipboardCheck}
        rows={review}
        emptyMessage="No plans approaching review."
        action="Build evidence pack"
        now={now}
        actionHrefBuilder={(r) =>
          `/sc/participants/${r.participantId}/evidence`
        }
      />
    </div>
  );
}

function PhaseSection({
  title,
  subtitle,
  icon: Icon,
  rows,
  emptyMessage,
  action,
  actionHrefBuilder,
  now,
}: {
  title: string;
  subtitle: string;
  icon: typeof FileText;
  rows: {
    planId: string;
    participantId: string;
    participantName: string;
    startDate: Date;
    endDate: Date;
    daysIn: number;
    daysToEnd: number;
    pctElapsed: number;
  }[];
  emptyMessage: string;
  action: string;
  actionHrefBuilder?: (r: {
    participantId: string;
    planId: string;
  }) => string;
  now: Date;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          <Badge variant="outline">{rows.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              void now;
              const href = actionHrefBuilder
                ? actionHrefBuilder(r)
                : `/sc/participants/${r.participantId}`;
              return (
                <li key={r.planId}>
                  <Link
                    href={href}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {r.participantName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(r.startDate, "dd/MM/yyyy")} →{" "}
                        {format(r.endDate, "dd/MM/yyyy")} ·{" "}
                        {Math.round(r.pctElapsed)}% elapsed ·{" "}
                        {r.daysToEnd >= 0
                          ? `${r.daysToEnd}d to end`
                          : `${Math.abs(r.daysToEnd)}d overdue`}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      {action}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}