import Link from "next/link";
import { format, formatDistanceStrict } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireManager } from "@/lib/rbac";
import { ProvidrLogo } from "@/components/providr-logo";
import {
  CERT_LABEL,
  certStatus,
  worstStatus,
} from "@/lib/certificates";
import { SEVERITY_LABEL } from "@/lib/incident-clock";

import { PrintButton } from "./print-button";

type SearchParams = Promise<{ from?: string; to?: string }>;

function parseDateOr(input: string | undefined, fallback: Date): Date {
  if (!input) return fallback;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function toDateInput(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DRAFT: "Draft",
  REPORTED: "Reported",
  UNDER_REVIEW: "Under review",
  CLOSED: "Closed",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated",
};

export default async function AuditPackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const context = await resolvePortalContext("provider");
  requireManager(context);

  const orgId = context.activeOrg.id;
  const orgName =
    context.activeOrg.tradingName ?? context.activeOrg.legalName;

  // Default window: last 90 days.
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 90);

  const from = parseDateOr(sp.from, defaultFrom);
  from.setHours(0, 0, 0, 0);
  const to = parseDateOr(sp.to, now);
  to.setHours(23, 59, 59, 999);

  const [
    participants,
    workers,
    shifts,
    incidents,
    agreements,
    carePlans,
  ] = await Promise.all([
    db.participant.findMany({
      where: { orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        firstName: true,
        lastName: true,
        ndisNumber: true,
      },
    }),
    db.worker.findMany({
      where: { orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        firstName: true,
        lastName: true,
        type: true,
        ndisWorkerCheckExpiry: true,
        firstAidExpiry: true,
      },
    }),
    db.shift.findMany({
      where: {
        orgId,
        scheduledStart: { gte: from, lte: to },
      },
      include: {
        worker: { select: { firstName: true, lastName: true } },
        participant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { scheduledStart: "asc" },
    }),
    db.incident.findMany({
      where: {
        orgId,
        occurredAt: { gte: from, lte: to },
      },
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
    }),
    db.serviceAgreement.findMany({
      where: {
        participant: { orgId },
        OR: [
          { status: "ACTIVE" },
          { startDate: { gte: from, lte: to } },
        ],
      },
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    db.carePlan.findMany({
      where: { orgId, status: "ACTIVE" },
      include: {
        participant: { select: { firstName: true, lastName: true } },
        goals: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Aggregated stats
  const totalShiftHours = shifts.reduce((sum, s) => {
    const ms = s.scheduledEnd.getTime() - s.scheduledStart.getTime();
    return sum + ms;
  }, 0);
  const totalShiftHoursStr =
    (totalShiftHours / (1000 * 60 * 60)).toFixed(1) + " h";

  const reportableIncidents = incidents.filter(
    (i) => i.severity === "REPORTABLE"
  );
  const submittedOnTime = reportableIncidents.filter((i) => {
    if (!i.reportedAt || !i.reportedToNdisAt) return false;
    return (
      i.reportedToNdisAt.getTime() <=
      i.reportedAt.getTime() + 24 * 60 * 60 * 1000
    );
  }).length;
  const submittedLate = reportableIncidents.filter((i) => {
    if (!i.reportedAt || !i.reportedToNdisAt) return false;
    return (
      i.reportedToNdisAt.getTime() >
      i.reportedAt.getTime() + 24 * 60 * 60 * 1000
    );
  }).length;
  const stillPending = reportableIncidents.filter(
    (i) => !i.reportedToNdisAt
  ).length;

  const certIssues = workers
    .map((w) => ({
      worker: w,
      status: worstStatus(
        certStatus(w.ndisWorkerCheckExpiry, now),
        certStatus(w.firstAidExpiry, now)
      ),
    }))
    .filter(
      (x) =>
        x.status === "expired" ||
        x.status === "expiring" ||
        x.status === "unset"
    );

  return (
    <div className="space-y-8 print:space-y-6">
      {/* Print-hidden controls header */}
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Audit pack
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Point-in-time compliance bundle. Use Print → Save as PDF for a
            shareable copy.
          </p>
        </div>
        <PrintButton />
      </div>

      {/* Date range selector — hidden from print */}
      <Card className="print:hidden">
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label
                htmlFor="from"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                From
              </label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={toDateInput(from)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="to"
                className="text-xs uppercase tracking-wider text-muted-foreground"
              >
                To
              </label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={toDateInput(to)}
                className="rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button type="submit" variant="outline">
              Refresh
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Begin printable content ──────────────────────────────── */}
      <div className="space-y-8 print:space-y-6">
        {/* Cover header — appears on print */}
        <div className="space-y-2 border-b pb-4">
          <div className="flex items-center justify-between">
            <ProvidrLogo height={28} />
            <span className="text-xs text-muted-foreground">
              Generated {format(now, "d MMM yyyy, h:mm a")}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Audit pack
            </p>
            <h2 className="text-xl font-semibold">{orgName}</h2>
            <p className="text-sm text-muted-foreground">
              {format(from, "d MMM yyyy")} – {format(to, "d MMM yyyy")} (
              {formatDistanceStrict(from, to)})
            </p>
          </div>
        </div>

        {/* Section 1: At a glance */}
        <section className="space-y-3">
          <h3 className="text-base font-semibold">At a glance</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Participants" value={participants.length} />
            <Stat label="Workers" value={workers.length} />
            <Stat label="Shifts in window" value={shifts.length} />
            <Stat label="Hours scheduled" value={totalShiftHoursStr} />
            <Stat label="Active care plans" value={carePlans.length} />
            <Stat
              label="Service agreements"
              value={agreements.length}
            />
            <Stat
              label="Reportable incidents"
              value={reportableIncidents.length}
            />
            <Stat
              label="Submitted on time"
              value={`${submittedOnTime} / ${reportableIncidents.length || 0}`}
              accent={submittedLate > 0 ? "destructive" : "default"}
            />
          </div>
          {(submittedLate > 0 || stillPending > 0) && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {submittedLate > 0 && (
                <p>
                  {submittedLate} reportable incident
                  {submittedLate === 1 ? "" : "s"} submitted late.
                </p>
              )}
              {stillPending > 0 && (
                <p>
                  {stillPending} reportable incident
                  {stillPending === 1 ? "" : "s"} still pending NDIS
                  submission.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Section 2: Worker compliance */}
        <SectionBreak />
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Worker compliance</h3>
          <p className="text-xs text-muted-foreground">
            {certIssues.length === 0
              ? "All workers have current certificates."
              : `${certIssues.length} worker${certIssues.length === 1 ? "" : "s"} with cert issues at report time.`}
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>NDIS Worker Check</TableHead>
                <TableHead>First Aid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => {
                const ndis = certStatus(w.ndisWorkerCheckExpiry, now);
                const firstAid = certStatus(w.firstAidExpiry, now);
                const overall = worstStatus(ndis, firstAid);
                return (
                  <TableRow key={w.firstName + w.lastName}>
                    <TableCell className="font-medium">
                      {w.firstName} {w.lastName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {w.type.replace(/_/g, " ").toLowerCase()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {w.ndisWorkerCheckExpiry
                        ? format(w.ndisWorkerCheckExpiry, "d MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {w.firstAidExpiry
                        ? format(w.firstAidExpiry, "d MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          overall === "expired" ? "destructive" : "outline"
                        }
                      >
                        {CERT_LABEL[overall]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </section>

        {/* Section 3: Incidents */}
        <SectionBreak />
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Incidents</h3>
          {incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No incidents recorded in the window.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Occurred</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>NDIS submission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.map((i) => {
                  let submission = "—";
                  if (i.severity === "REPORTABLE") {
                    if (!i.reportedAt) submission = "No clock";
                    else if (!i.reportedToNdisAt) submission = "Pending";
                    else {
                      const onTime =
                        i.reportedToNdisAt.getTime() <=
                        i.reportedAt.getTime() + 24 * 60 * 60 * 1000;
                      submission = onTime ? "On time" : "Late";
                    }
                  }
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="text-xs">
                        {format(i.occurredAt, "d MMM yyyy h:mm a")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {i.participant?.firstName} {i.participant?.lastName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            i.severity === "REPORTABLE"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {SEVERITY_LABEL[i.severity]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {STATUS_LABEL[i.status]}
                      </TableCell>
                      <TableCell className="text-xs">{submission}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>

        {/* Section 4: Service agreements */}
        <SectionBreak />
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Service agreements</h3>
          {agreements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No service agreements in the window.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Signed</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agreements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs font-medium">
                      {a.participant.firstName} {a.participant.lastName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {format(a.startDate, "d MMM yyyy")}
                      {a.endDate &&
                        ` – ${format(a.endDate, "d MMM yyyy")}`}
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.signedAt
                        ? format(a.signedAt, "d MMM yyyy")
                        : "Not yet"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.uploadedFileName
                        ? a.uploadedFileName
                        : a.documentUrl
                          ? "External link"
                          : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {STATUS_LABEL[a.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        {/* Section 5: Care plans + goals */}
        <SectionBreak />
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Care plans & goals</h3>
          {carePlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active care plans.
            </p>
          ) : (
            <div className="space-y-3">
              {carePlans.map((cp) => {
                const inProgress = cp.goals.filter(
                  (g) => g.status === "IN_PROGRESS"
                ).length;
                const achieved = cp.goals.filter(
                  (g) => g.status === "ACHIEVED"
                ).length;
                return (
                  <Card key={cp.id} className="break-inside-avoid">
                    <CardHeader>
                      <CardTitle className="text-sm">
                        {cp.participant.firstName} {cp.participant.lastName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex flex-wrap gap-4">
                        <span>
                          <strong>{cp.goals.length}</strong> goals
                        </span>
                        <span>
                          <strong>{inProgress}</strong> in progress
                        </span>
                        <span>
                          <strong>{achieved}</strong> achieved
                        </span>
                      </div>
                      {cp.summary && (
                        <>
                          <Separator />
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {cp.summary}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 6: Shifts in window */}
        <SectionBreak />
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Shifts in window</h3>
          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No shifts in the window.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Worker</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-xs">
                      {format(s.scheduledStart, "d MMM h:mm a")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.worker.firstName} {s.worker.lastName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {s.participant.firstName} {s.participant.lastName}
                    </TableCell>
                    <TableCell className="text-xs">
                      {STATUS_LABEL[s.status]}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        <div className="pt-6 text-center text-xs text-muted-foreground print:pt-2">
          End of pack — {format(now, "d MMM yyyy, h:mm a")}
        </div>
      </div>

      <div className="print:hidden">
        <Button variant="ghost" render={<Link href="/provider" />}>
          ← Back to overview
        </Button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string | number;
  accent?: "default" | "destructive";
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div
        className={
          accent === "destructive"
            ? "text-xl font-semibold tracking-tight text-destructive"
            : "text-xl font-semibold tracking-tight"
        }
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function SectionBreak() {
  return <div className="print:break-before-page" aria-hidden />;
}