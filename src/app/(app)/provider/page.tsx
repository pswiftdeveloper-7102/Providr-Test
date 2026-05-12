import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileSignature,
  HardHat,
  HeartPulse,
  Plus,
  Printer,
  RefreshCcw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Users,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ModuleTabs } from "@/components/module-tabs";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { getActiveRoles, isManager, ROLE_LABEL } from "@/lib/rbac";
import {
  certStatus,
  CERT_LABEL,
  EXPIRY_WARNING_DAYS,
  worstStatus,
  type CertStatus,
} from "@/lib/certificates";
import {
  clockState,
  formatDuration,
} from "@/lib/incident-clock";

type LifecyclePhase = {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
};

const PHASES: LifecyclePhase[] = [
  {
    step: 1,
    title: "Referral comes in",
    description:
      "From a coordinator, family, or NDIA — capture and triage.",
    icon: UserPlus,
    href: "/provider/participants",
  },
  {
    step: 2,
    title: "Meet & agree",
    description:
      "Meet the participant, assess needs, sign the service agreement.",
    icon: FileSignature,
  },
  {
    step: 3,
    title: "Make a care plan",
    description:
      "Document needs, decide what to deliver, plan workers and hours.",
    icon: HeartPulse,
    href: "/provider/care-plans",
  },
  {
    step: 4,
    title: "Get rostered",
    description: "Match workers, brief the team, run the first shift.",
    icon: CalendarClock,
    href: "/provider/roster",
  },
  {
    step: 5,
    title: "Deliver every shift",
    description: "Workers turn up, provide the help, write shift notes.",
    icon: ClipboardList,
    href: "/provider/shifts",
  },
  {
    step: 6,
    title: "Yearly review",
    description:
      "Review what worked, update the care plan, renew the agreement.",
    icon: RefreshCcw,
  },
];

const SHIFT_STATUS_VARIANT: Record<
  "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  "default" | "secondary" | "outline" | "destructive"
> = {
  SCHEDULED: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

const SHIFT_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export default async function ProviderHome() {
  const context = await resolvePortalContext("provider");
  // Support workers don't get the manager overview — send them straight
  // to their shifts list.
  if (!isManager(context)) redirect("/provider/shifts");

  const orgId = context.activeOrg.id;

  // Window for "today" — midnight to midnight in the user's local timezone.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // Window for "expiring soon" — between now and EXPIRY_WARNING_DAYS out.
  const now = new Date();
  const warningCutoff = new Date(now);
  warningCutoff.setDate(warningCutoff.getDate() + EXPIRY_WARNING_DAYS);

  // Window for renewals due — Phase 6 work shown on the dashboard for
  // roles that drive the review cycle.
  const reviewHorizon = new Date(now);
  reviewHorizon.setDate(reviewHorizon.getDate() + 90);

  // 30-day window for stat-card deltas — "X new this month".
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const activeRoles = getActiveRoles(context);

  const [
    participantCount,
    workerCount,
    openShifts,
    openIncidents,
    participantsLast30,
    workersLast30,
    incidentsLast30,
    todayShifts,
    reportableIncidents,
    expiringWorkers,
    reviewsDueCount,
    participantsWithoutCarePlanCount,
  ] = await Promise.all([
    db.participant.count({ where: { orgId } }),
    db.worker.count({ where: { orgId } }),
    db.shift.count({
      where: { orgId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    }),
    db.incident.count({
      where: {
        orgId,
        status: { in: ["DRAFT", "REPORTED", "UNDER_REVIEW"] },
      },
    }),
    db.participant.count({
      where: { orgId, createdAt: { gte: monthAgo } },
    }),
    db.worker.count({
      where: { orgId, createdAt: { gte: monthAgo } },
    }),
    db.incident.count({
      where: { orgId, reportedAt: { gte: monthAgo } },
    }),
    db.shift.findMany({
      where: {
        orgId,
        scheduledStart: { gte: todayStart, lt: todayEnd },
      },
      include: {
        participant: { select: { firstName: true, lastName: true } },
        worker: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledStart: "asc" },
    }),
    db.incident.findMany({
      where: {
        orgId,
        severity: "REPORTABLE",
        reportedToNdisAt: null,
      },
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { reportedAt: "asc" },
    }),
    db.worker.findMany({
      where: {
        orgId,
        OR: [
          {
            ndisWorkerCheckExpiry: { not: null, lte: warningCutoff },
          },
          {
            firstAidExpiry: { not: null, lte: warningCutoff },
          },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        ndisWorkerCheckExpiry: true,
        firstAidExpiry: true,
      },
    }),
    // Total renewal items in the 90-day window — covers plans, care plans,
    // and service agreements. Mirrors what /provider/reviews surfaces.
    Promise.all([
      db.plan.count({
        where: {
          participant: { orgId },
          status: { in: ["ACTIVE", "DRAFT"] },
          endDate: { lte: reviewHorizon },
        },
      }),
      db.carePlan.count({
        where: {
          orgId,
          status: "ACTIVE",
          effectiveTo: { not: null, lte: reviewHorizon },
        },
      }),
      db.serviceAgreement.count({
        where: {
          participant: { orgId },
          status: "ACTIVE",
          endDate: { not: null, lte: reviewHorizon },
        },
      }),
    ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
    // Participants with no DRAFT/ACTIVE care plan — Care manager's beat.
    db.participant.count({
      where: {
        orgId,
        carePlans: { none: { status: { in: ["DRAFT", "ACTIVE"] } } },
      },
    }),
  ]);

  // Derive the action items: only incidents still pending/overdue belong
  // in the "Action needed" bucket on the home dashboard.
  const incidentItems = reportableIncidents
    .map((i) => ({ incident: i, state: clockState(i, now) }))
    .filter(
      (x) =>
        x.state.kind === "pending" || x.state.kind === "overdue-unsubmitted"
    );

  const certItems = expiringWorkers
    .map((w) => {
      const ndis = certStatus(w.ndisWorkerCheckExpiry, now);
      const firstAid = certStatus(w.firstAidExpiry, now);
      return { worker: w, status: worstStatus(ndis, firstAid), ndis, firstAid };
    })
    .filter((c) => c.status === "expired" || c.status === "expiring");

  type Delta = {
    value: number;
    direction: "up" | "down" | "flat";
    suffix: string;
  } | null;
  type StatCard = {
    label: string;
    value: number;
    icon: LucideIcon;
    accent: "default" | "danger";
    delta: Delta;
  };
  const stats: StatCard[] = [
    {
      label: "Participants",
      value: participantCount,
      icon: Users,
      accent: "default",
      delta: participantsLast30
        ? { value: participantsLast30, direction: "up", suffix: "this month" }
        : null,
    },
    {
      label: "Support workers",
      value: workerCount,
      icon: HardHat,
      accent: "default",
      delta: workersLast30
        ? { value: workersLast30, direction: "up", suffix: "this month" }
        : null,
    },
    {
      label: "Open shifts",
      value: openShifts,
      icon: CalendarClock,
      accent: "default",
      delta: todayShifts.length
        ? {
            value: todayShifts.length,
            direction: "flat",
            suffix: "on today",
          }
        : null,
    },
    {
      label: "Open incidents",
      value: openIncidents,
      icon: ShieldAlert,
      accent: incidentItems.length > 0 ? "danger" : "default",
      delta: incidentsLast30
        ? {
            value: incidentsLast30,
            direction: incidentsLast30 > openIncidents ? "down" : "up",
            suffix: "this month",
          }
        : null,
    },
  ];

  // Role-aware focus items — different roles see different priority cards.
  // We union across all of the user's manager roles to avoid hiding
  // anything for users who wear two hats.
  type FocusItem = {
    key: string;
    icon: typeof HeartPulse;
    label: string;
    value: number;
    href: string;
    urgent?: boolean;
    helper?: string;
  };
  const focusItems: FocusItem[] = [];
  const seenKeys = new Set<string>();
  const pushFocus = (item: FocusItem) => {
    if (seenKeys.has(item.key)) return;
    seenKeys.add(item.key);
    focusItems.push(item);
  };

  if (activeRoles.includes("ROSTERING_MANAGER")) {
    pushFocus({
      key: "today-shifts",
      icon: CalendarClock,
      label: "Shifts today",
      value: todayShifts.length,
      href: "/provider/roster",
      helper: "Rostering",
    });
  }
  if (activeRoles.includes("CARE_MANAGER") || activeRoles.includes("OWNER")) {
    pushFocus({
      key: "participants-no-plan",
      icon: HeartPulse,
      label: "Without an active care plan",
      value: participantsWithoutCarePlanCount,
      href: "/provider/participants",
      urgent: participantsWithoutCarePlanCount > 0,
      helper: "Care",
    });
    pushFocus({
      key: "reviews-due",
      icon: ClipboardCheck,
      label: "Reviews due in 90 days",
      value: reviewsDueCount,
      href: "/provider/reviews",
      urgent: reviewsDueCount > 0,
      helper: "Care",
    });
  }
  if (
    activeRoles.includes("COMPLIANCE_MANAGER") ||
    activeRoles.includes("OWNER")
  ) {
    pushFocus({
      key: "incident-pending",
      icon: ShieldAlert,
      label: "Reportable incidents pending NDIS",
      value: incidentItems.length,
      href: "/provider/incidents",
      urgent: incidentItems.length > 0,
      helper: "Compliance",
    });
    pushFocus({
      key: "certs-expiring",
      icon: HardHat,
      label: "Workers with certs expiring",
      value: certItems.length,
      href: "/provider/workers",
      urgent: certItems.some((c) => c.status === "expired"),
      helper: "Compliance",
    });
  }

  const roleLabels = activeRoles
    .filter((r) => r !== "SUPPORT_WORKER" && r !== "SUPPORT_COORDINATOR")
    .map((r) => ROLE_LABEL[r]);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {context.user.name?.split(" ")[0] ?? "there"}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Provider operations for{" "}
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
            render={<Link href="/provider/audit-pack" />}
          >
            <Printer />
            Audit pack
          </Button>
        </div>
      </header>

      <ModuleTabs portal="provider" />

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
            <Card key={stat.label} size="sm" className="overflow-hidden">
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
          );
        })}
      </section>

      {/* Today section — what's happening on the floor right now. */}
      <section aria-labelledby="today-heading" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 id="today-heading" className="text-lg font-semibold">
            On today
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Today's roster */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>Today&apos;s roster</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">
                  {todayShifts.length} shift
                  {todayShifts.length === 1 ? "" : "s"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {todayShifts.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No shifts scheduled for today.
                  </p>
                  <Button
                    size="sm"
                    render={<Link href="/provider/roster/new" />}
                  >
                    <Plus />
                    Schedule a shift
                  </Button>
                </div>
              ) : (
                <ul className="divide-y">
                  {todayShifts.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/provider/shifts/${s.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {s.worker.firstName} {s.worker.lastName}
                            <span className="mx-1.5 text-muted-foreground">
                              →
                            </span>
                            {s.participant.firstName} {s.participant.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(s.scheduledStart, "h:mm a")} –{" "}
                            {format(s.scheduledEnd, "h:mm a")}
                          </div>
                        </div>
                        <Badge variant={SHIFT_STATUS_VARIANT[s.status]}>
                          {SHIFT_STATUS_LABEL[s.status]}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Action needed — reportable incidents + cert expiries */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>Action needed</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">
                  {incidentItems.length + certItems.length} item
                  {incidentItems.length + certItems.length === 1 ? "" : "s"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {incidentItems.length === 0 && certItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  All clear. Nothing pending NDIS submission, no expiring
                  certificates.
                </div>
              ) : (
                <ul className="divide-y">
                  {incidentItems.map(({ incident, state }) => (
                    <li key={incident.id}>
                      <Link
                        href={`/provider/incidents/${incident.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium">
                              Reportable incident —{" "}
                              {incident.participant?.firstName}{" "}
                              {incident.participant?.lastName}
                            </div>
                            <div className="text-xs">
                              {state.kind === "pending" && (
                                <span className="text-amber-700">
                                  <Clock className="mr-1 inline h-3 w-3" />
                                  {formatDuration(state.remainingMs)} until NDIS
                                  deadline
                                </span>
                              )}
                              {state.kind === "overdue-unsubmitted" && (
                                <span className="font-medium text-destructive">
                                  Overdue by{" "}
                                  {formatDuration(state.overdueByMs)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                  {certItems.map(({ worker, status }) => (
                    <li key={worker.id}>
                      <Link
                        href={`/provider/workers/${worker.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <HardHat
                            className={
                              status === "expired"
                                ? "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                                : "mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                            }
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium">
                              {worker.firstName} {worker.lastName}
                            </div>
                            <div className="text-xs">
                              <CertSummary status={status} />
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {focusItems.length > 0 && (
        <section aria-labelledby="focus-heading" className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="focus-heading" className="text-lg font-semibold">
              Your focus
            </h2>
            {roleLabels.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Signed in as {roleLabels.join(" · ")}
              </p>
            )}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {focusItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <Link href={item.href} className="block">
                    <Card
                      size="sm"
                      className={
                        item.urgent
                          ? "border-destructive/40 transition-colors hover:bg-destructive/5"
                          : "transition-colors hover:bg-muted/40"
                      }
                    >
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              item.urgent
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-2xl font-semibold tracking-tight">
                                {item.value}
                              </span>
                              {item.helper && (
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {item.helper}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {item.label}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-labelledby="lifecycle-heading">
        <div className="mb-4 flex items-baseline justify-between">
          <h2
            id="lifecycle-heading"
            className="text-lg font-semibold"
          >
            Participant lifecycle
          </h2>
          <p className="text-xs text-muted-foreground">
            Phases 5 and 6 repeat every plan year.
          </p>
        </div>

        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PHASES.map((phase) => {
            const Icon = phase.icon;
            const card = (
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          Phase {phase.step}
                        </Badge>
                        {phase.href && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <CardTitle className="mt-1.5">{phase.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {phase.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );

            return (
              <li key={phase.step}>
                {phase.href ? (
                  <Link href={phase.href} className="block h-full">
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function CertSummary({ status }: { status: CertStatus }) {
  if (status === "expired") {
    return (
      <span className="font-medium text-destructive">
        Certificate expired — can&apos;t roster
      </span>
    );
  }
  if (status === "expiring") {
    return (
      <span className="text-amber-700">
        Certificate {CERT_LABEL[status].toLowerCase()} — renew before next
        cycle
      </span>
    );
  }
  return <span className="text-muted-foreground">{CERT_LABEL[status]}</span>;
}