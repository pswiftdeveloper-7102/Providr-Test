import Link from "next/link";
import { format, startOfMonth, subDays } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

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
import { clockState, formatDuration } from "@/lib/incident-clock";
import { cn } from "@/lib/utils";

const SEVERITY_VARIANT = {
  MINOR: "outline",
  MODERATE: "secondary",
  SERIOUS: "default",
  REPORTABLE: "destructive",
} as const;

export default async function AppHomePage() {
  const context = await resolvePortalContext("provider");
  const orgId = context.activeOrg.id;
  const now = new Date();
  const monthStart = startOfMonth(now);
  const weekAgo = subDays(now, 7);

  const [
    totalCount,
    openCount,
    mtdReportable,
    weekCount,
    recent,
    overdueReportables,
  ] = await Promise.all([
    db.incident.count({ where: { orgId } }),
    db.incident.count({
      where: {
        orgId,
        status: { in: ["DRAFT", "REPORTED", "UNDER_REVIEW"] },
      },
    }),
    db.incident.count({
      where: {
        orgId,
        severity: "REPORTABLE",
        reportedAt: { gte: monthStart },
      },
    }),
    db.incident.count({
      where: { orgId, occurredAt: { gte: weekAgo } },
    }),
    db.incident.findMany({
      where: { orgId },
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 5,
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
  ]);

  const actionNeeded = overdueReportables
    .map((i) => ({ incident: i, state: clockState(i, now) }))
    .filter(
      (x) =>
        x.state.kind === "pending" || x.state.kind === "overdue-unsubmitted"
    );

  const firstName = context.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          Hi, {firstName}.
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {format(now, "EEEE, dd MMM")}
        </p>
      </header>

      {actionNeeded.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base text-destructive">
                Action needed
              </CardTitle>
            </div>
            <CardDescription>
              {actionNeeded.length} reportable incident
              {actionNeeded.length === 1 ? "" : "s"} pending NDIS submission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {actionNeeded.slice(0, 3).map(({ incident, state }) => (
              <Link
                key={incident.id}
                href={`/app/incidents/${incident.id}`}
                className="flex items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm transition-colors active:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {incident.participant
                      ? `${incident.participant.firstName} ${incident.participant.lastName}`
                      : "Unspecified participant"}
                  </p>
                  <p className="text-xs">
                    {state.kind === "overdue-unsubmitted" ? (
                      <span className="font-medium text-destructive">
                        Overdue {formatDuration(state.overdueByMs)}
                      </span>
                    ) : (
                      <span className="text-amber-700">
                        {state.kind === "pending"
                          ? `${formatDuration(state.remainingMs)} left`
                          : ""}
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3">
        <StatCard
          icon={FileText}
          label="Total"
          value={totalCount}
          helper="All time"
        />
        <StatCard
          icon={AlertTriangle}
          label="Open"
          value={openCount}
          helper={openCount === 0 ? "All clear" : "Action needed"}
          tone={openCount > 0 ? "warn" : "good"}
        />
        <StatCard
          icon={ShieldAlert}
          label="Reportable"
          value={mtdReportable}
          helper="This month"
          tone={mtdReportable > 0 ? "warn" : "neutral"}
        />
        <StatCard
          icon={TrendingUp}
          label="Last 7 days"
          value={weekCount}
          helper="New incidents"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
          <CardDescription>
            Choose how to log the next incident.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <QuickAction
            href="/app/incidents/new/quick"
            icon={Zap}
            label="Quick Report"
            description="Log essentials in under 2 minutes."
          />
          <QuickAction
            href="/app/incidents/new/ai"
            icon={Sparkles}
            label="AI-Assisted Report"
            description="Describe what happened — AI structures it."
            recommended
          />
          <QuickAction
            href="/app/incidents/new/wizard"
            icon={ClipboardList}
            label="Compliance Wizard"
            description="Step-by-step NDIS-compliant flow."
          />
        </CardContent>
      </Card>

      <section className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent incidents
          </h2>
          <Link
            href="/app/incidents"
            className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No incidents yet. Tap Report when you need to log one.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {recent.map((i) => (
                  <li key={i.id}>
                    <Link
                      href={`/app/incidents/${i.id}`}
                      className="flex items-center gap-3 px-3 py-3 transition-colors active:bg-muted"
                    >
                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant={SEVERITY_VARIANT[i.severity]}
                            className="text-[10px]"
                          >
                            {i.severity.toLowerCase()}
                          </Badge>
                          <span className="truncate text-sm font-medium">
                            {i.participant
                              ? `${i.participant.firstName} ${i.participant.lastName}`
                              : "Unspecified"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(i.occurredAt, "dd MMM, h:mm a")}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "neutral",
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  helper: string;
  tone?: "neutral" | "good" | "warn";
}) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md",
              tone === "warn" && "bg-amber-100 text-amber-700",
              tone === "good" && "bg-emerald-100 text-emerald-700",
              tone === "neutral" && "bg-primary/10 text-primary"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-semibold leading-none tracking-tight">
          {value}
        </p>
        <p className="mt-1.5 text-[11px] text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  recommended,
}: {
  href: string;
  icon: typeof Zap;
  label: string;
  description: string;
  recommended?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-white p-3 transition-colors active:bg-muted",
        recommended && "border-primary/30 bg-primary/5"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          "bg-primary/10 text-primary"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium", recommended && "text-primary")}>
            {label}
          </p>
          {recommended && (
            <Badge variant="default" className="text-[10px]">
              Recommended
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}