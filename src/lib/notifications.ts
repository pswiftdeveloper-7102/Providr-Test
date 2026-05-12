import { differenceInCalendarDays } from "date-fns";

import { db } from "@/lib/db";
import type { ResolvedPortalContext } from "@/lib/session";

/**
 * Notifications are derived from existing data — no separate events
 * store. Each request to the dropdown re-queries the source-of-truth
 * tables and surfaces the items a user would want to know about.
 *
 * Provider focus: reportable incidents past or near the 24h NDIS
 * deadline, expiring worker certs, plans/care plans/agreements nearing
 * expiry.
 *
 * SC focus: open escalations, hot budget buckets, plans ending soon.
 */
export type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  href: string;
  unread: boolean;
  urgent?: boolean;
};

// Q2 (2026-05-12): tiered cert warnings. 60d = first heads-up, 30d =
// escalated, 7d = urgent. The query window is the widest band; per-cert
// tiering happens below when building notification rows.
const CERT_WARN_DAYS = 60;
const CERT_TIER_NUDGE = 60;
const CERT_TIER_ESCALATED = 30;
const CERT_TIER_URGENT = 7;
const PLAN_REVIEW_DAYS = 60;
const BUDGET_HOT = 0.9;

function certTier(
  daysUntilExpiry: number
): "expired" | "urgent" | "escalated" | "nudge" | null {
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= CERT_TIER_URGENT) return "urgent";
  if (daysUntilExpiry <= CERT_TIER_ESCALATED) return "escalated";
  if (daysUntilExpiry <= CERT_TIER_NUDGE) return "nudge";
  return null;
}

export async function getNotifications(
  context: ResolvedPortalContext
): Promise<Notification[]> {
  return context.activePortal === "provider"
    ? getProviderNotifications(context)
    : getSCNotifications(context);
}

async function getProviderNotifications(
  context: ResolvedPortalContext
): Promise<Notification[]> {
  const orgId = context.activeOrg.id;
  const now = new Date();
  const certCutoff = new Date(now);
  certCutoff.setDate(certCutoff.getDate() + CERT_WARN_DAYS);
  const planCutoff = new Date(now);
  planCutoff.setDate(planCutoff.getDate() + PLAN_REVIEW_DAYS);

  const [
    reportableIncidents,
    expiringWorkers,
    expiringPlans,
    expiringCarePlans,
    expiringAgreements,
  ] = await Promise.all([
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
      take: 20,
    }),
    db.worker.findMany({
      where: {
        orgId,
        OR: [
          { ndisWorkerCheckExpiry: { not: null, lte: certCutoff } },
          { firstAidExpiry: { not: null, lte: certCutoff } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        ndisWorkerCheckExpiry: true,
        firstAidExpiry: true,
      },
      take: 20,
    }),
    db.plan.findMany({
      where: {
        participant: { orgId },
        status: { in: ["ACTIVE", "DRAFT"] },
        endDate: { lte: planCutoff },
      },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { endDate: "asc" },
      take: 10,
    }),
    db.carePlan.findMany({
      where: {
        orgId,
        status: "ACTIVE",
        effectiveTo: { not: null, lte: planCutoff },
      },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { effectiveTo: "asc" },
      take: 10,
    }),
    db.serviceAgreement.findMany({
      where: {
        participant: { orgId },
        status: "ACTIVE",
        endDate: { not: null, lte: planCutoff },
      },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { endDate: "asc" },
      take: 10,
    }),
  ]);

  const out: Notification[] = [];

  for (const i of reportableIncidents) {
    const deadlineMs =
      (i.reportedAt ?? i.occurredAt).getTime() + 24 * 60 * 60 * 1000;
    const remainingHrs = (deadlineMs - now.getTime()) / (60 * 60 * 1000);
    const name = i.participant
      ? `${i.participant.firstName} ${i.participant.lastName}`
      : "a participant";
    out.push({
      id: `incident-${i.id}`,
      title:
        remainingHrs < 0
          ? "Reportable incident overdue"
          : "Reportable incident — submit to NDIS",
      body: `${name} · ${
        remainingHrs < 0
          ? `${Math.abs(Math.round(remainingHrs))}h past deadline`
          : `${Math.round(remainingHrs)}h until deadline`
      }`,
      time: relativeTime(i.reportedAt ?? i.occurredAt, now),
      href: `/provider/incidents/${i.id}`,
      unread: true,
      urgent: remainingHrs < 0 || remainingHrs < 6,
    });
  }

  for (const w of expiringWorkers) {
    const ndisDays = w.ndisWorkerCheckExpiry
      ? differenceInCalendarDays(w.ndisWorkerCheckExpiry, now)
      : null;
    const firstAidDays = w.firstAidExpiry
      ? differenceInCalendarDays(w.firstAidExpiry, now)
      : null;

    const ndisTier = ndisDays !== null ? certTier(ndisDays) : null;
    const firstAidTier = firstAidDays !== null ? certTier(firstAidDays) : null;
    // Skip workers that are inside the query window (≤60d) but only on
    // one cert that's still >60d on the other — nothing to surface.
    if (!ndisTier && !firstAidTier) continue;

    const pieces: string[] = [];
    if (ndisDays !== null && ndisTier) {
      pieces.push(
        ndisDays < 0
          ? `NDIS check expired ${Math.abs(ndisDays)}d ago`
          : `NDIS check in ${ndisDays}d`
      );
    }
    if (firstAidDays !== null && firstAidTier) {
      pieces.push(
        firstAidDays < 0
          ? `First Aid expired ${Math.abs(firstAidDays)}d ago`
          : `First Aid in ${firstAidDays}d`
      );
    }

    // Worst tier across both certs drives the row's severity.
    const tiers = [ndisTier, firstAidTier].filter(Boolean) as Array<
      "expired" | "urgent" | "escalated" | "nudge"
    >;
    const rank = { expired: 4, urgent: 3, escalated: 2, nudge: 1 } as const;
    const worst = tiers.reduce((a, b) => (rank[a] >= rank[b] ? a : b));

    const titleSuffix =
      worst === "expired"
        ? "cert expired"
        : worst === "urgent"
        ? "cert expires this week"
        : worst === "escalated"
        ? "cert expires within 30 days"
        : "cert expires within 60 days";

    out.push({
      id: `cert-${w.id}`,
      title: `${w.firstName} ${w.lastName} — ${titleSuffix}`,
      body: pieces.join(" · "),
      time: "",
      href: `/provider/workers/${w.id}`,
      unread: worst === "expired" || worst === "urgent" || worst === "escalated",
      urgent: worst === "expired" || worst === "urgent",
    });
  }

  for (const p of expiringPlans) {
    const days = differenceInCalendarDays(p.endDate, now);
    out.push({
      id: `plan-${p.id}`,
      title: `${p.participant.firstName} ${p.participant.lastName} — NDIS plan ending`,
      body: `${days}d until plan ends — Phase 6 review`,
      time: "",
      href: `/provider/reviews`,
      unread: days < 30,
      urgent: days < 14,
    });
  }

  for (const cp of expiringCarePlans) {
    if (!cp.effectiveTo) continue;
    const days = differenceInCalendarDays(cp.effectiveTo, now);
    out.push({
      id: `careplan-${cp.id}`,
      title: `${cp.participant.firstName} ${cp.participant.lastName} — care plan ending`,
      body: `Care plan ends in ${days}d`,
      time: "",
      href: `/provider/participants/${cp.participant.id}/care-plan/edit`,
      unread: days < 30,
    });
  }

  for (const a of expiringAgreements) {
    if (!a.endDate) continue;
    const days = differenceInCalendarDays(a.endDate, now);
    out.push({
      id: `agreement-${a.id}`,
      title: `${a.participant.firstName} ${a.participant.lastName} — service agreement`,
      body: `Service agreement ends in ${days}d`,
      time: "",
      href: `/provider/participants/${a.participant.id}/agreements/new`,
      unread: days < 30,
    });
  }

  return out;
}

async function getSCNotifications(
  context: ResolvedPortalContext
): Promise<Notification[]> {
  const orgId = context.activeOrg.id;
  const now = new Date();
  const planCutoff = new Date(now);
  planCutoff.setDate(planCutoff.getDate() + PLAN_REVIEW_DAYS);

  const [escalations, plans, hotBudgets] = await Promise.all([
    db.escalation.findMany({
      where: { orgId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: {
        participant: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ status: "asc" }, { openedAt: "desc" }],
      take: 15,
    }),
    db.plan.findMany({
      where: {
        participant: { orgId },
        status: { in: ["ACTIVE", "DRAFT"] },
        endDate: { lte: planCutoff },
      },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { endDate: "asc" },
      take: 10,
    }),
    db.plan.findMany({
      where: {
        participant: { orgId },
        status: "ACTIVE",
        budgets: { some: { totalCents: { gt: 0 } } },
      },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
        budgets: true,
      },
      take: 50,
    }),
  ]);

  const out: Notification[] = [];

  for (const e of escalations) {
    const days = differenceInCalendarDays(now, e.openedAt);
    out.push({
      id: `escalation-${e.id}`,
      title: `${e.participant.firstName} ${e.participant.lastName} — ${e.type
        .toLowerCase()
        .replace(/_/g, " ")}`,
      body:
        e.description.length > 120
          ? `${e.description.slice(0, 120)}…`
          : e.description,
      time: days === 0 ? "today" : `${days}d ago`,
      href: `/sc/escalations/${e.id}`,
      unread: e.status === "OPEN",
      urgent: e.status === "OPEN",
    });
  }

  for (const p of plans) {
    const days = differenceInCalendarDays(p.endDate, now);
    out.push({
      id: `plan-${p.id}`,
      title: `${p.participant.firstName} ${p.participant.lastName} — plan ending`,
      body: `${days}d until plan ends`,
      time: "",
      href: `/sc/participants/${p.participant.id}`,
      unread: days < 30,
      urgent: days < 14,
    });
  }

  for (const p of hotBudgets) {
    for (const b of p.budgets) {
      if (b.totalCents === 0) continue;
      const pct = b.spentCents / b.totalCents;
      if (pct < BUDGET_HOT) continue;
      out.push({
        id: `budget-${b.id}`,
        title: `${p.participant.firstName} ${p.participant.lastName} — ${b.category.toLowerCase()} hot`,
        body: `${Math.round(pct * 100)}% spent`,
        time: "",
        href: `/sc/participants/${p.participant.id}`,
        unread: pct >= 1,
        urgent: pct >= 1,
      });
    }
  }

  return out;
}

function relativeTime(d: Date, now: Date): string {
  const diffHrs = (now.getTime() - d.getTime()) / (60 * 60 * 1000);
  if (diffHrs < 1) return `${Math.round(diffHrs * 60)}m ago`;
  if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`;
  return `${Math.round(diffHrs / 24)}d ago`;
}