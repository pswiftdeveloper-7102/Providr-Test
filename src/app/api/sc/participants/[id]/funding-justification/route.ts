import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import {
  renderFundingJustificationPdf,
  type FundingJustificationData,
} from "@/lib/pdf/funding-justification-pdf";

// Q6 (2026-05-12): printable funding-justification report for SC plan
// reviews. Aggregates the data the evidence page already shows and
// renders it as a one-document PDF the SC can attach to a review request.

type Bucket = "CORE" | "CAPACITY" | "CAPITAL";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const context = await resolvePortalContext("sc");

  const participant = await db.participant.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      plans: {
        where: { status: "ACTIVE" },
        include: { budgets: true },
        orderBy: { startDate: "desc" },
        take: 1,
      },
      engagements: {
        include: {
          externalProvider: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      escalations: {
        orderBy: { openedAt: "desc" },
      },
      carePlans: {
        where: { status: { in: ["DRAFT", "ACTIVE"] } },
        include: { goals: { orderBy: { createdAt: "asc" } } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!participant) {
    return new NextResponse("Not found", { status: 404 });
  }

  const plan = participant.plans[0];
  const carePlan = participant.carePlans[0];
  const planBudgetIds = plan?.budgets.map((b) => b.id) ?? [];
  const spend = planBudgetIds.length
    ? await db.spendEntry.findMany({
        where: { planBudgetId: { in: planBudgetIds } },
        include: { planBudget: { select: { category: true } } },
        orderBy: { occurredAt: "asc" },
      })
    : [];

  // Roll spend up by provider name (free text) and by bucket.
  const byProvider = new Map<
    string,
    { providerName: string; totalCents: number; entryCount: number }
  >();
  const byBucket = new Map<
    Bucket,
    { category: Bucket; totalCents: number; entryCount: number }
  >();
  for (const s of spend) {
    const providerKey = (s.providerName ?? "Unspecified provider").trim() || "Unspecified provider";
    const prev = byProvider.get(providerKey) ?? {
      providerName: providerKey,
      totalCents: 0,
      entryCount: 0,
    };
    prev.totalCents += s.amountCents;
    prev.entryCount += 1;
    byProvider.set(providerKey, prev);

    const bucket = s.planBudget.category as Bucket;
    const prevB = byBucket.get(bucket) ?? {
      category: bucket,
      totalCents: 0,
      entryCount: 0,
    };
    prevB.totalCents += s.amountCents;
    prevB.entryCount += 1;
    byBucket.set(bucket, prevB);
  }

  const data: FundingJustificationData = {
    org: {
      legalName: context.activeOrg.legalName,
      tradingName: context.activeOrg.tradingName,
    },
    participant: {
      firstName: participant.firstName,
      lastName: participant.lastName,
      ndisNumber: participant.ndisNumber,
    },
    plan: plan
      ? {
          ndisPlanNumber: plan.ndisPlanNumber,
          startDate: plan.startDate,
          endDate: plan.endDate,
          totalCents: plan.totalCents,
          budgets: plan.budgets.map((b) => ({
            category: b.category as Bucket,
            totalCents: b.totalCents,
            spentCents: b.spentCents,
          })),
        }
      : null,
    engagements: participant.engagements.map((e) => ({
      providerName: e.externalProvider.name,
      status: e.status,
      serviceSummary: e.serviceSummary,
      startedAt: e.startedAt,
      endedAt: e.endedAt,
    })),
    spendByProvider: Array.from(byProvider.values()).sort(
      (a, b) => b.totalCents - a.totalCents
    ),
    spendByBucket: Array.from(byBucket.values()),
    goals:
      carePlan?.goals.map((g) => ({
        title: g.title,
        description: g.description,
        status: g.status,
        evidenceSummary: g.evidenceSummary,
      })) ?? [],
    escalations: participant.escalations.map((e) => ({
      type: e.type,
      description: e.description,
      resolution: e.resolution,
      openedAt: e.openedAt,
      resolvedAt: e.resolvedAt,
    })),
    generatedAt: new Date(),
  };

  const buffer = await renderFundingJustificationPdf(data);
  const fileName = `funding-justification-${participant.lastName.toLowerCase()}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}