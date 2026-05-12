import Link from "next/link";
import { Wallet } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/utils";
import { resolvePortalContext } from "@/lib/session";

const BUCKET_LABEL: Record<string, string> = {
  CORE: "Core supports",
  CAPACITY: "Capacity building",
  CAPITAL: "Capital",
};

export default async function SCBudgetsPage() {
  const context = await resolvePortalContext("sc");
  const now = new Date();

  const plans = await db.plan.findMany({
    where: {
      participant: { orgId: context.activeOrg.id },
      status: "ACTIVE",
    },
    include: {
      participant: { select: { id: true, firstName: true, lastName: true } },
      budgets: true,
    },
    orderBy: { endDate: "asc" },
  });

  // Compute spend pace per plan — "spent percentage" vs "time elapsed
  // percentage". A bucket spending faster than time means it's at risk of
  // exhaustion before the plan ends.
  type PlanRow = {
    planId: string;
    participantId: string;
    participantName: string;
    endDate: Date;
    daysToEnd: number;
    timeElapsedPct: number;
    buckets: {
      category: string;
      total: number;
      spent: number;
      remaining: number;
      pct: number;
      pace: "ahead" | "on-track" | "behind"; // ahead = under-spending vs time, behind = over-spending
    }[];
  };

  const rows: PlanRow[] = plans.map((p) => {
    const totalDays =
      Math.max(1, differenceInCalendarDays(p.endDate, p.startDate));
    const elapsedDays = Math.max(
      0,
      Math.min(totalDays, differenceInCalendarDays(now, p.startDate))
    );
    const timeElapsedPct = (elapsedDays / totalDays) * 100;
    const daysToEnd = differenceInCalendarDays(p.endDate, now);

    const buckets = p.budgets.map((b) => {
      const total = b.totalCents;
      const spent = b.spentCents;
      const pct = total > 0 ? (spent / total) * 100 : 0;
      const delta = pct - timeElapsedPct;
      const pace: PlanRow["buckets"][number]["pace"] =
        delta > 10 ? "behind" : delta < -10 ? "ahead" : "on-track";
      return {
        category: b.category as string,
        total,
        spent,
        remaining: total - spent,
        pct,
        pace,
      };
    });

    return {
      planId: p.id,
      participantId: p.participant.id,
      participantName: `${p.participant.firstName} ${p.participant.lastName}`,
      endDate: p.endDate,
      daysToEnd,
      timeElapsedPct,
      buckets,
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Budgets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SC Job 4 — spend pace across every active plan. &ldquo;Behind&rdquo;
          means burning faster than the calendar.
        </p>
      </header>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>No active plans</CardTitle>
                <CardDescription>
                  Add a participant and capture their plan to start tracking
                  budget.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.planId}>
              <Card>
                <CardHeader className="border-b">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/sc/participants/${r.participantId}`}
                      className="text-base font-semibold hover:underline"
                    >
                      {r.participantName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      Plan ends {format(r.endDate, "dd/MM/yyyy")}
                      <span className="ml-1">
                        ({r.daysToEnd}d · {Math.round(r.timeElapsedPct)}%
                        elapsed)
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {r.buckets.map((b) => (
                    <div key={b.category}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {BUCKET_LABEL[b.category] ?? b.category}
                          </span>
                          <Badge
                            variant={
                              b.pace === "behind"
                                ? "destructive"
                                : b.pace === "ahead"
                                  ? "outline"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {b.pace === "behind"
                              ? "burning fast"
                              : b.pace === "ahead"
                                ? "under-spent"
                                : "on track"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatCents(b.spent)} of {formatCents(b.total)} ·{" "}
                          {formatCents(b.remaining)} left
                        </span>
                      </div>
                      <Progress value={b.pct} className="mt-1.5" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}