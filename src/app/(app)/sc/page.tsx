import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileText,
  type LucideIcon,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BudgetChart,
  type BudgetChartDatum,
} from "@/components/dashboard-charts/budget-chart";
import { db } from "@/lib/db";
import { formatCents } from "@/lib/utils";
import { resolvePortalContext } from "@/lib/session";

const REVIEW_HORIZON_DAYS = 90;
const BUDGET_HOT_THRESHOLD = 0.8; // bucket spent >80%

export default async function SCHome() {
  const context = await resolvePortalContext("sc");
  const orgId = context.activeOrg.id;
  const now = new Date();

  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + REVIEW_HORIZON_DAYS);

  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [
    participantCount,
    providerCount,
    openEscalations,
    plansEndingSoon,
    participantsLast30,
    escalationsLast30,
    hotBudgets,
    recentEscalations,
  ] = await Promise.all([
    db.participant.count({ where: { orgId } }),
    db.externalProvider.count({ where: { orgId } }),
    db.escalation.count({
      where: { orgId, status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    db.plan.count({
      where: {
        participant: { orgId },
        status: { in: ["ACTIVE", "DRAFT"] },
        endDate: { lte: horizon },
      },
    }),
    db.participant.count({
      where: { orgId, createdAt: { gte: monthAgo } },
    }),
    db.escalation.count({
      where: { orgId, openedAt: { gte: monthAgo } },
    }),
    // Plans where ANY bucket is >80% spent.
    db.plan.findMany({
      where: {
        participant: { orgId },
        status: "ACTIVE",
        budgets: {
          some: {
            // Postgres won't let us compare two columns in `where`; we
            // overfetch slightly and filter in JS below.
            totalCents: { gt: 0 },
          },
        },
      },
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true },
        },
        budgets: true,
      },
      take: 50,
    }),
    db.escalation.findMany({
      where: { orgId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { openedAt: "desc" },
      take: 5,
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    }),
  ]);

  // Filter the candidate plans: keep only ones with at least one hot bucket.
  type HotBucket = {
    planId: string;
    participantId: string;
    participantName: string;
    endDate: Date;
    category: "CORE" | "CAPACITY" | "CAPITAL";
    pct: number;
    remainingCents: number;
  };
  const hot: HotBucket[] = [];
  for (const p of hotBudgets) {
    for (const b of p.budgets) {
      if (b.totalCents === 0) continue;
      const pct = b.spentCents / b.totalCents;
      if (pct < BUDGET_HOT_THRESHOLD) continue;
      hot.push({
        planId: p.id,
        participantId: p.participant.id,
        participantName: `${p.participant.firstName} ${p.participant.lastName}`,
        endDate: p.endDate,
        category: b.category as "CORE" | "CAPACITY" | "CAPITAL",
        pct,
        remainingCents: b.totalCents - b.spentCents,
      });
    }
  }
  hot.sort((a, b) => b.pct - a.pct);

  // Top 5 active plans by total funding for the dashboard chart.
  // Show utilisation per bucket as percent so they're directly comparable.
  const chartPlans = [...hotBudgets]
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 5);
  const budgetChartData: BudgetChartDatum[] = chartPlans.map((p) => {
    const core = p.budgets.find((b) => b.category === "CORE");
    const capacity = p.budgets.find((b) => b.category === "CAPACITY");
    const capital = p.budgets.find((b) => b.category === "CAPITAL");
    const pct = (
      b: typeof p.budgets[number] | undefined
    ): number => {
      if (!b || b.totalCents === 0) return 0;
      return Math.min(100, (b.spentCents / b.totalCents) * 100);
    };
    return {
      participant: `${p.participant.firstName} ${p.participant.lastName.charAt(0)}.`,
      Core: pct(core),
      Capacity: pct(capacity),
      Capital: pct(capital),
    };
  });

  type Delta = {
    value: number;
    direction: "up" | "down" | "flat";
    suffix: string;
  } | null;
  type StatCard = {
    label: string;
    value: number;
    href: string;
    icon: LucideIcon;
    accent: "default" | "danger";
    delta: Delta;
  };
  const stats: StatCard[] = [
    {
      label: "Participants",
      value: participantCount,
      href: "/sc/participants",
      icon: Users,
      accent: "default",
      delta: participantsLast30
        ? { value: participantsLast30, direction: "up", suffix: "this month" }
        : null,
    },
    {
      label: "Providers in network",
      value: providerCount,
      href: "/sc/providers",
      icon: Building2,
      accent: "default",
      delta: null,
    },
    {
      label: "Open escalations",
      value: openEscalations,
      href: "/sc/escalations",
      icon: AlertTriangle,
      accent: openEscalations > 0 ? "danger" : "default",
      delta: escalationsLast30
        ? {
            value: escalationsLast30,
            direction: escalationsLast30 > openEscalations ? "down" : "up",
            suffix: "this month",
          }
        : null,
    },
    {
      label: "Plans ending in 90 days",
      value: plansEndingSoon,
      href: "/sc/reviews",
      icon: ClipboardCheck,
      accent: "default",
      delta: null,
    },
  ];

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {context.user.name?.split(" ")[0] ?? "there"}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Support coordination for{" "}
            <span className="font-medium text-foreground">
              {context.activeOrg.tradingName ?? context.activeOrg.legalName}
            </span>
            .
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Today
            </p>
            <p className="text-sm font-medium">
              {format(now, "EEEE, dd/MM/yyyy")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/sc/participants/new" />}
          >
            <Plus />
            New participant
          </Button>
        </div>
      </header>

      <Alert>
        <AlertTriangle />
        <AlertTitle>Heads up — the SC role is changing</AlertTitle>
        <AlertDescription>
          NDIA is stripping ~30% of SC funding and merging the role with plan
          management. Going forward SCs will only serve complex-needs
          participants. This portal is being scoped for that world.
        </AlertDescription>
      </Alert>

      <section
        aria-labelledby="stats-heading"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        <h2 id="stats-heading" className="sr-only">
          At a glance
        </h2>
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isDanger = stat.accent === "danger";
          return (
            <Link key={stat.label} href={stat.href}>
              <Card
                size="sm"
                className="overflow-hidden transition-colors hover:bg-muted/40"
              >
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {stat.label}
                    </div>
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isDanger
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">
                    {stat.value}
                  </div>
                  {stat.delta ? (
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      {stat.delta.direction === "up" && (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                      )}
                      {stat.delta.direction === "down" && (
                        <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                      )}
                      <span
                        className={
                          stat.delta.direction === "up"
                            ? "font-medium text-emerald-700"
                            : stat.delta.direction === "down"
                            ? "font-medium text-destructive"
                            : "font-medium text-muted-foreground"
                        }
                      >
                        {stat.delta.direction === "up" ? "+" : ""}
                        {stat.delta.value}
                      </span>
                      <span className="text-muted-foreground">
                        {stat.delta.suffix}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-1 h-4" />
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      {budgetChartData.length > 0 && (
        <section aria-labelledby="budget-chart-heading" className="space-y-3">
          <h2 id="budget-chart-heading" className="sr-only">
            Budget utilisation
          </h2>
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <CardTitle>Budget utilisation</CardTitle>
                  <CardDescription className="mt-1">
                    Top {budgetChartData.length} active plans by total funding —
                    percent spent per bucket.
                  </CardDescription>
                </div>
                <div className="hidden gap-3 text-[10px] uppercase tracking-wider text-muted-foreground sm:flex">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-primary" />
                    Core
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-primary/55" />
                    Capacity
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-primary/25" />
                    Capital
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <BudgetChart data={budgetChartData} />
            </CardContent>
          </Card>
        </section>
      )}

      <section aria-labelledby="six-jobs-heading">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="six-jobs-heading" className="text-lg font-semibold">
            The six jobs
          </h2>
          <p className="text-xs text-muted-foreground">
            From the SC reference diagram
          </p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SIX_JOBS.map((job) => (
            <li key={job.title}>
              <Link href={job.href} className="block h-full">
                <Card className="h-full transition-colors hover:bg-muted/30">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <job.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Badge variant="secondary" className="text-[10px]">
                          {job.tag}
                        </Badge>
                        <CardTitle className="mt-1.5">{job.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {job.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="today-heading" className="space-y-4">
        <h2 id="today-heading" className="text-lg font-semibold">
          What needs you
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>Budgets running hot</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">
                  {hot.length} bucket{hot.length === 1 ? "" : "s"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {hot.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  All buckets under {Math.round(BUDGET_HOT_THRESHOLD * 100)}%
                  spent.
                </div>
              ) : (
                <ul className="divide-y">
                  {hot.slice(0, 6).map((h) => {
                    const days = differenceInCalendarDays(h.endDate, now);
                    return (
                      <li key={`${h.planId}-${h.category}`}>
                        <Link
                          href={`/sc/participants/${h.participantId}`}
                          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium">
                              {h.participantName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {h.category.toLowerCase()} ·{" "}
                              {Math.round(h.pct * 100)}% spent ·{" "}
                              {formatCents(h.remainingCents)} left ·{" "}
                              {days}d to plan end
                            </div>
                          </div>
                          <Badge
                            variant={
                              h.pct >= 1
                                ? "destructive"
                                : h.pct >= 0.9
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-[10px]"
                          >
                            {Math.round(h.pct * 100)}%
                          </Badge>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>Open escalations</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">
                  {recentEscalations.length} item
                  {recentEscalations.length === 1 ? "" : "s"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentEscalations.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nothing on fire today.
                </div>
              ) : (
                <ul className="divide-y">
                  {recentEscalations.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/sc/escalations`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {e.participant.firstName} {e.participant.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ESCALATION_TYPE_LABEL[e.type]} ·{" "}
                            {format(e.openedAt, "dd/MM")}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

const SIX_JOBS = [
  {
    title: "Read the plan",
    tag: "Job 1",
    description: "Decode the budget, identify goals, flag gaps.",
    icon: FileText,
    href: "/sc/participants",
  },
  {
    title: "Find providers",
    tag: "Job 2",
    description: "Search the network, check capacity, negotiate rates.",
    icon: Building2,
    href: "/sc/providers",
  },
  {
    title: "Set up the team",
    tag: "Job 3",
    description: "Sign service agreements, share care info, schedule shifts.",
    icon: Users,
    href: "/sc/participants",
  },
  {
    title: "Watch the money",
    tag: "Job 4",
    description: "Track cross-provider spend and projected burn rate.",
    icon: Wallet,
    href: "/sc/budgets",
  },
  {
    title: "Handle crises",
    tag: "Job 5",
    description: "Drops, hospital, reportable incidents, emergency cover.",
    icon: AlertTriangle,
    href: "/sc/escalations",
  },
  {
    title: "Build evidence",
    tag: "Job 6",
    description: "Gather notes, map to NDIS rules, prep the plan review.",
    icon: ClipboardCheck,
    href: "/sc/evidence",
  },
] as const;

const ESCALATION_TYPE_LABEL: Record<string, string> = {
  PROVIDER_DROP: "Provider drop",
  HOSPITAL: "Hospital",
  REPORTABLE_INCIDENT: "Reportable incident",
  FAMILY_ISSUE: "Family issue",
  EMERGENCY_COVER: "Emergency cover",
  PLAN_BREACH: "Plan breach",
  OTHER: "Other",
};