import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileSignature, HeartPulse, Wallet } from "lucide-react";
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
import { requireManager } from "@/lib/rbac";

// Phase 6 of the participant lifecycle (Provider Scene B): yearly review.
// The work the diagram describes — "Review what worked, update the care
// plan, renew the agreement" — happens against three different artefacts.
// This page surfaces everything coming due in the next 90 days so the
// manager can drive renewals before they lapse.

const HORIZON_DAYS = 90;
const URGENT_DAYS = 30;

export default async function ReviewsPage() {
  const context = await resolvePortalContext("provider");
  requireManager(context);

  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + HORIZON_DAYS);

  const [plans, carePlans, agreements] = await Promise.all([
    db.plan.findMany({
      where: {
        participant: { orgId: context.activeOrg.id },
        status: { in: ["ACTIVE", "DRAFT"] },
        endDate: { lte: horizon },
      },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { endDate: "asc" },
    }),
    db.carePlan.findMany({
      where: {
        orgId: context.activeOrg.id,
        status: "ACTIVE",
        effectiveTo: { not: null, lte: horizon },
      },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { effectiveTo: "asc" },
    }),
    db.serviceAgreement.findMany({
      where: {
        participant: { orgId: context.activeOrg.id },
        status: "ACTIVE",
        endDate: { not: null, lte: horizon },
      },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { endDate: "asc" },
    }),
  ]);

  const totals = plans.length + carePlans.length + agreements.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reviews due soon
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Phase 6 of the participant lifecycle — everything renewing within
            the next {HORIZON_DAYS} days.
          </p>
        </div>
        <Badge variant={totals > 0 ? "secondary" : "outline"}>
          {totals} item{totals === 1 ? "" : "s"}
        </Badge>
      </header>

      <Section
        icon={Wallet}
        title="NDIS plans"
        subtitle="When the participant's plan ends, the cycle restarts. The evidence pack you submit shapes the next year."
        rows={plans.map((p) => ({
          id: p.id,
          name: `${p.participant.firstName} ${p.participant.lastName}`,
          href: `/provider/participants/${p.participant.id}`,
          dueAt: p.endDate,
          reference: p.ndisPlanNumber
            ? `Plan ${p.ndisPlanNumber}`
            : "NDIS plan",
        }))}
        now={now}
        emptyMessage="No NDIS plans expiring in the window."
      />

      <Section
        icon={HeartPulse}
        title="Care plans"
        subtitle="Care plans usually run a year. Review goals, update context, refresh the BSP reference."
        rows={carePlans.map((c) => ({
          id: c.id,
          name: `${c.participant.firstName} ${c.participant.lastName}`,
          href: `/provider/participants/${c.participant.id}/care-plan/edit`,
          dueAt: c.effectiveTo,
          reference: "Care plan",
        }))}
        now={now}
        emptyMessage="No care plans expiring in the window."
      />

      <Section
        icon={FileSignature}
        title="Service agreements"
        subtitle="The compliance artefact NDIS asks for. Renew before it lapses."
        rows={agreements.map((a) => ({
          id: a.id,
          name: `${a.participant.firstName} ${a.participant.lastName}`,
          href: `/provider/participants/${a.participant.id}/agreements/new`,
          dueAt: a.endDate,
          reference: "Service agreement",
        }))}
        now={now}
        emptyMessage="No agreements expiring in the window."
      />
    </div>
  );
}

type Row = {
  id: string;
  name: string;
  href: string;
  dueAt: Date | null;
  reference: string;
};

function Section({
  icon: Icon,
  title,
  subtitle,
  rows,
  now,
  emptyMessage,
}: {
  icon: typeof ClipboardCheck;
  title: string;
  subtitle: string;
  rows: Row[];
  now: Date;
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          <div className="ml-auto">
            <Badge variant="outline">{rows.length}</Badge>
          </div>
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
              const days = r.dueAt
                ? differenceInCalendarDays(r.dueAt, now)
                : null;
              const overdue = days !== null && days < 0;
              const urgent = days !== null && days >= 0 && days <= URGENT_DAYS;
              return (
                <li key={r.id}>
                  <Link
                    href={r.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.reference}
                        {r.dueAt && (
                          <>
                            <span className="mx-1.5">·</span>
                            {format(r.dueAt, "dd/MM/yyyy")}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {days !== null && (
                        <Badge
                          variant={
                            overdue
                              ? "destructive"
                              : urgent
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {overdue
                            ? `${Math.abs(days)}d overdue`
                            : days === 0
                              ? "today"
                              : `${days}d`}
                        </Badge>
                      )}
                      <Button size="sm" variant="ghost">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
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