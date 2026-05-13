import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";
import { certStatus, worstStatus } from "@/lib/certificates";
import {
  renderAuditPackPdf,
  type AuditPackData,
} from "@/lib/pdf/audit-pack-pdf";

// Audit Pack PDF download. Mirrors the queries on
// /provider/audit-pack so what the admin sees on screen matches the
// downloaded report exactly. `from` + `to` query params accept ISO dates;
// defaults to the last 90 days.

function parseDateOr(input: string | null, fallback: Date): Date {
  if (!input) return fallback;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const url = new URL(req.url);
  const orgId = context.activeOrg.id;

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 90);
  const from = parseDateOr(url.searchParams.get("from"), defaultFrom);
  from.setHours(0, 0, 0, 0);
  const to = parseDateOr(url.searchParams.get("to"), now);
  to.setHours(23, 59, 59, 999);

  const [
    participantCount,
    workers,
    shifts,
    incidents,
    agreements,
    carePlans,
  ] = await Promise.all([
    db.participant.count({ where: { orgId } }),
    db.worker.findMany({
      where: { orgId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        firstName: true,
        lastName: true,
        ndisWorkerCheckExpiry: true,
        firstAidExpiry: true,
      },
    }),
    db.shift.findMany({
      where: { orgId, scheduledStart: { gte: from, lte: to } },
      select: {
        scheduledStart: true,
        scheduledEnd: true,
      },
    }),
    db.incident.findMany({
      where: { orgId, occurredAt: { gte: from, lte: to } },
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
        goals: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalShiftMs = shifts.reduce(
    (sum, s) => sum + (s.scheduledEnd.getTime() - s.scheduledStart.getTime()),
    0
  );
  const shiftHoursInWindow = totalShiftMs / (1000 * 60 * 60);

  const reportable = incidents.filter((i) => i.severity === "REPORTABLE");
  const submittedOnTime = reportable.filter((i) => {
    if (!i.reportedAt || !i.reportedToNdisAt) return false;
    return (
      i.reportedToNdisAt.getTime() <=
      i.reportedAt.getTime() + 24 * 60 * 60 * 1000
    );
  }).length;
  const submittedLate = reportable.filter((i) => {
    if (!i.reportedAt || !i.reportedToNdisAt) return false;
    return (
      i.reportedToNdisAt.getTime() >
      i.reportedAt.getTime() + 24 * 60 * 60 * 1000
    );
  }).length;
  const stillPending = reportable.filter((i) => !i.reportedToNdisAt).length;

  const certIssues = workers
    .map((w) => ({
      name: `${w.firstName} ${w.lastName}`,
      ndisExpiry: w.ndisWorkerCheckExpiry,
      firstAidExpiry: w.firstAidExpiry,
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

  const data: AuditPackData = {
    org: {
      legalName: context.activeOrg.legalName,
      tradingName: context.activeOrg.tradingName,
    },
    windowFrom: from,
    windowTo: to,
    generatedAt: now,
    stats: {
      participants: participantCount,
      workers: workers.length,
      shiftsInWindow: shifts.length,
      shiftHoursInWindow,
      incidentsInWindow: incidents.length,
      reportableInWindow: reportable.length,
      submittedOnTime,
      submittedLate,
      stillPending,
      activeCarePlans: carePlans.length,
      activeAgreements: agreements.filter((a) => a.status === "ACTIVE").length,
    },
    certIssues: certIssues.map((c) => ({
      worker: c.name,
      ndisExpiry: c.ndisExpiry,
      firstAidExpiry: c.firstAidExpiry,
      status: c.status as "expired" | "expiring" | "unset",
    })),
    incidents: incidents.map((i) => ({
      occurredAt: i.occurredAt,
      participant: i.participant
        ? `${i.participant.firstName} ${i.participant.lastName}`
        : null,
      severity: i.severity,
      status: i.status,
      reportedToNdisAt: i.reportedToNdisAt,
      description: i.description,
    })),
    agreements: agreements.map((a) => ({
      participant: `${a.participant.firstName} ${a.participant.lastName}`,
      startDate: a.startDate,
      endDate: a.endDate,
      signedAt: a.signedAt,
      status: a.status,
    })),
    carePlans: carePlans.map((cp) => ({
      participant: `${cp.participant.firstName} ${cp.participant.lastName}`,
      goalCount: cp.goals.length,
    })),
  };

  const buffer = await renderAuditPackPdf(data);
  const fileName = `audit-pack-${(
    context.activeOrg.tradingName ?? context.activeOrg.legalName
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${now.toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}