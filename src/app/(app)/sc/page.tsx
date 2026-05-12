import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileText,
  Plus,
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
import { ModuleTabs } from "@/components/module-tabs";
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

  const [
    participantCount,
    providerCount,
    openEscalations,
    plansEndingSoon,
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

  const stats = [
    {
      label: "Participants",
      value: participantCount,
      href: "/sc/participants",
    },
    {
      label: "Providers in network",
      value: providerCount,
      href: "/sc/providers",
    },
    {
      label: "Open escalations",
      value: openEscalations,
      href: "/sc/escalations",
    },
    {
      label: "Plans ending in 90 days",
      value: plansEndingSoon,
      href: "/sc/reviews",
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
        <div className="flex flex-col items-end gap-2">
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

      <ModuleTabs portal="sc" />

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
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card size="sm" className="transition-colors hover:bg-muted/40">
              <CardContent>
                <div className="text-3xl font-semibold tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

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