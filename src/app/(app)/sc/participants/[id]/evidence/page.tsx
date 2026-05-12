import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ClipboardCheck,
  FileText,
  Wallet,
} from "lucide-react";

import { PrintButton } from "@/app/(app)/provider/audit-pack/print-button";
import { GoalEvidenceForm } from "../goal-evidence-form";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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

const BUCKET_LABEL: Record<string, string> = {
  CORE: "Core supports",
  CAPACITY: "Capacity building",
  CAPITAL: "Capital",
};

const ESCALATION_TYPE_LABEL: Record<string, string> = {
  PROVIDER_DROP: "Provider drop",
  HOSPITAL: "Hospital",
  REPORTABLE_INCIDENT: "Reportable incident",
  FAMILY_ISSUE: "Family issue",
  EMERGENCY_COVER: "Emergency cover",
  PLAN_BREACH: "Plan breach",
  OTHER: "Other",
};

export default async function ParticipantEvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("sc");
  const now = new Date();

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
          externalProvider: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      escalations: {
        orderBy: { openedAt: "desc" },
      },
      carePlans: {
        where: { status: { in: ["DRAFT", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { goals: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!participant) notFound();

  const plan = participant.plans[0];
  const carePlan = participant.carePlans[0];
  const planBudgetIds = plan ? plan.budgets.map((b) => b.id) : [];
  const spend = planBudgetIds.length
    ? await db.spendEntry.findMany({
        where: { planBudgetId: { in: planBudgetIds } },
        orderBy: { occurredAt: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Button variant="ghost" size="sm" render={<Link href="/sc/evidence" />}>
          <ArrowLeft />
          All evidence packs
        </Button>
        <div className="flex flex-wrap gap-2">
          {plan?.planFileKey && (
            <Button
              variant="outline"
              size="sm"
              render={
                <a
                  href={`/api/uploads/${plan.planFileKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              View original plan PDF
            </Button>
          )}
          <PrintButton />
        </div>
      </div>

      <header className="border-b pb-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Evidence pack
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {participant.firstName} {participant.lastName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {participant.ndisNumber
            ? `NDIS #${participant.ndisNumber} · `
            : ""}
          Compiled {format(now, "dd/MM/yyyy")}
        </p>
      </header>

      {plan && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <CardTitle>The plan we worked from</CardTitle>
            </div>
            <CardDescription>
              {format(plan.startDate, "dd/MM/yyyy")} —{" "}
              {format(plan.endDate, "dd/MM/yyyy")} · total{" "}
              {formatCents(plan.totalCents)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plan.budgets.map((b) => {
              const pct = b.totalCents > 0 ? (b.spentCents / b.totalCents) * 100 : 0;
              return (
                <div key={b.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {BUCKET_LABEL[b.category] ?? b.category}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatCents(b.spentCents)} of {formatCents(b.totalCents)}{" "}
                      ({Math.round(pct)}%)
                    </span>
                  </div>
                  <Progress value={pct} className="mt-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {carePlan && carePlan.goals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Goals we tracked</CardTitle>
            </div>
            <CardDescription>
              What the participant set out to achieve, and where each goal
              landed by year end.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {carePlan.goals.map((g) => (
                <li
                  key={g.id}
                  className="rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{g.title}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {g.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                  {g.description && (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                      {g.description}
                    </p>
                  )}
                  <Separator className="my-2" />
                  <GoalEvidenceForm
                    goalId={g.id}
                    initialSummary={g.evidenceSummary ?? ""}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle>The team delivering supports</CardTitle>
          </div>
          <CardDescription>
            Every provider engaged this plan year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participant.engagements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No providers engaged this year.
            </p>
          ) : (
            <ul className="space-y-2">
              {participant.engagements.map((e) => (
                <li
                  key={e.id}
                  className="rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {e.externalProvider.name}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {e.status.toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>
                  {e.serviceSummary && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.serviceSummary}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.startedAt && `Started ${format(e.startedAt, "dd/MM/yyyy")}`}
                    {e.endedAt && ` · ended ${format(e.endedAt, "dd/MM/yyyy")}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Spend log</CardTitle>
          </div>
          <CardDescription>
            What the plan funded across the year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {spend.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No spend entries recorded.
            </p>
          ) : (
            <ul className="space-y-2">
              {spend.map((s) => (
                <li
                  key={s.id}
                  className="flex items-baseline justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{s.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.providerName ? `${s.providerName} · ` : ""}
                      {format(s.occurredAt, "dd/MM/yyyy")}
                    </div>
                  </div>
                  <span className="font-medium">
                    {formatCents(s.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Things that came up</CardTitle>
          </div>
          <CardDescription>
            Escalations during the plan year — what happened and how it was
            resolved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participant.escalations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No escalations recorded.
            </p>
          ) : (
            <ul className="space-y-3">
              {participant.escalations.map((esc) => (
                <li
                  key={esc.id}
                  className="rounded-md border bg-muted/30 px-3 py-2"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {ESCALATION_TYPE_LABEL[esc.type]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(esc.openedAt, "dd/MM/yyyy")}
                      {esc.resolvedAt &&
                        ` → resolved ${format(esc.resolvedAt, "dd/MM")}`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs whitespace-pre-wrap">
                    {esc.description}
                  </p>
                  {esc.resolution && (
                    <>
                      <Separator className="my-2" />
                      <p className="text-xs whitespace-pre-wrap">
                        <span className="font-medium">Resolution:</span>{" "}
                        {esc.resolution}
                      </p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
