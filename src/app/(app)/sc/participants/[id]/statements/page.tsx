import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Wallet } from "lucide-react";
import {
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
  isSameMonth,
} from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/utils";
import { resolvePortalContext } from "@/lib/session";

import { PrintButton } from "@/app/(app)/provider/audit-pack/print-button";

const BUCKET_LABEL: Record<string, string> = {
  CORE: "Core supports",
  CAPACITY: "Capacity building",
  CAPITAL: "Capital",
};

export default async function StatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const context = await resolvePortalContext("sc");
  const now = new Date();

  // Parse `?month=YYYY-MM` or default to last month (the most useful slice
  // for an SC sending statements early in the new month).
  let monthStart: Date;
  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, m] = sp.month.split("-").map(Number);
    monthStart = startOfMonth(new Date(y, m - 1, 1));
  } else {
    monthStart = startOfMonth(subMonths(now, 1));
  }
  const monthEnd = endOfMonth(monthStart);
  const monthLabel = format(monthStart, "MMMM yyyy");

  const participant = await db.participant.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      plans: {
        where: { status: "ACTIVE" },
        include: { budgets: true },
        take: 1,
        orderBy: { startDate: "desc" },
      },
    },
  });
  if (!participant) notFound();

  const plan = participant.plans[0];
  if (!plan) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" render={<Link href={`/sc/participants/${id}`} />}>
          <ArrowLeft />
          Back to participant
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>No active plan</CardTitle>
            <CardDescription>
              Add a plan before generating statements.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const planBudgetIds = plan.budgets.map((b) => b.id);
  const monthSpend = await db.spendEntry.findMany({
    where: {
      planBudgetId: { in: planBudgetIds },
      occurredAt: { gte: monthStart, lte: monthEnd },
    },
    include: { planBudget: { select: { category: true } } },
    orderBy: { occurredAt: "asc" },
  });

  const monthByCategory = {
    CORE: 0,
    CAPACITY: 0,
    CAPITAL: 0,
  };
  for (const s of monthSpend) {
    const cat = s.planBudget.category as keyof typeof monthByCategory;
    monthByCategory[cat] += s.amountCents;
  }

  const monthTotal =
    monthByCategory.CORE + monthByCategory.CAPACITY + monthByCategory.CAPITAL;

  // Month-over-month options for the selector — last 6 months.
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, i);
    return {
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
      isCurrent: isSameMonth(d, monthStart),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/sc/participants/${id}`} />}
        >
          <ArrowLeft />
          Back to participant
        </Button>
        <PrintButton />
      </div>

      <header className="border-b pb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Monthly statement
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {participant.firstName} {participant.lastName} — {monthLabel}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spend across all providers for the month. Compiled{" "}
          {format(now, "d MMM yyyy")}.
        </p>
      </header>

      <nav
        aria-label="Pick month"
        className="flex flex-wrap gap-2 print:hidden"
      >
        {monthOptions.map((opt) => (
          <Button
            key={opt.value}
            size="sm"
            variant={opt.isCurrent ? "default" : "outline"}
            render={
              <Link
                href={`/sc/participants/${id}/statements?month=${opt.value}`}
              />
            }
          >
            {opt.label}
          </Button>
        ))}
      </nav>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <CardTitle>This month at a glance</CardTitle>
          </div>
          <CardAction>
            <Badge variant="secondary">{formatCents(monthTotal)}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          {(["CORE", "CAPACITY", "CAPITAL"] as const).map((cat) => {
            const bucket = plan.budgets.find((b) => b.category === cat);
            const monthAmount = monthByCategory[cat];
            const total = bucket?.totalCents ?? 0;
            const spentToDate = bucket?.spentCents ?? 0;
            const pct = total > 0 ? (spentToDate / total) * 100 : 0;
            return (
              <div key={cat}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {BUCKET_LABEL[cat]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCents(monthAmount)} this month ·{" "}
                    {formatCents(spentToDate)} of {formatCents(total)} ytd
                  </span>
                </div>
                <Progress value={pct} className="mt-1.5" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Itemised spend</CardTitle>
          </div>
          <CardDescription>
            Every entry posted against the plan in {monthLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {monthSpend.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No spend recorded this month.
            </p>
          ) : (
            <ul className="space-y-2">
              {monthSpend.map((s) => (
                <li
                  key={s.id}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{s.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.providerName ? `${s.providerName} · ` : ""}
                      {BUCKET_LABEL[s.planBudget.category]} ·{" "}
                      {format(s.occurredAt, "d MMM yyyy")}
                    </div>
                  </div>
                  <span className="font-medium">
                    {formatCents(s.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Separator className="my-3" />
          <div className="flex items-baseline justify-between text-sm font-medium">
            <span>Total for {monthLabel}</span>
            <span>{formatCents(monthTotal)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}