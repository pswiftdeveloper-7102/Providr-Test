import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertOctagon,
  Brain,
  ExternalLink,
  FileSignature,
  HeartPulse,
  MessageCircle,
  Pencil,
  Phone,
  Pill,
  Plus,
  ShieldAlert,
  Sparkles,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";

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
import { resolvePortalContext } from "@/lib/session";
import { isManager } from "@/lib/rbac";
import { formatCents } from "@/lib/utils";
import type {
  GoalCategory,
  GoalStatus,
  ServiceAgreementStatus,
} from "@prisma/client";

import { AddGoalForm } from "./care-plan/add-goal-form";

const GOAL_CATEGORY_LABEL: Record<GoalCategory, string> = {
  SOCIAL: "Social",
  PHYSICAL: "Physical",
  COMMUNICATION: "Communication",
  INDEPENDENT_LIVING: "Independent living",
  COMMUNITY_PARTICIPATION: "Community",
  EMPLOYMENT: "Employment",
  OTHER: "Other",
};

const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  IN_PROGRESS: "In progress",
  ACHIEVED: "Achieved",
  PAUSED: "Paused",
  DROPPED: "Dropped",
};

const GOAL_STATUS_VARIANT: Record<
  GoalStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  IN_PROGRESS: "secondary",
  ACHIEVED: "default",
  PAUSED: "outline",
  DROPPED: "destructive",
};

const AGREEMENT_STATUS_VARIANT: Record<
  ServiceAgreementStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  ACTIVE: "secondary",
  EXPIRED: "outline",
  TERMINATED: "destructive",
};

const BUCKET_LABEL: Record<"CORE" | "CAPACITY" | "CAPITAL", string> = {
  CORE: "Core supports",
  CAPACITY: "Capacity building",
  CAPITAL: "Capital",
};

const BUCKET_HINT: Record<"CORE" | "CAPACITY" | "CAPITAL", string> = {
  CORE: "Daily life — workers, transport, consumables",
  CAPACITY: "Therapy and skills",
  CAPITAL: "One-off purchases — equipment, mods",
};

export default async function ParticipantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("provider");
  const canEdit = isManager(context);

  const participant = await db.participant.findFirst({
    where: { id, orgId: context.activeOrg.id },
    include: {
      plans: {
        orderBy: { startDate: "desc" },
        include: { budgets: true },
      },
      serviceAgreements: {
        orderBy: [{ status: "asc" }, { startDate: "desc" }],
      },
      carePlans: {
        where: { status: { in: ["DRAFT", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          goals: { orderBy: { createdAt: "asc" } },
        },
      },
      behaviourSupportPlans: {
        where: { status: { in: ["DRAFT", "ACTIVE"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!participant) notFound();

  const activePlan = participant.plans.find((p) => p.status === "ACTIVE");
  const activeAgreement =
    participant.serviceAgreements.find((a) => a.status === "ACTIVE") ??
    participant.serviceAgreements[0] ??
    null;
  const carePlan = participant.carePlans[0] ?? null;
  const bsp = participant.behaviourSupportPlans[0] ?? null;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Participant
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {participant.firstName} {participant.lastName}
            {participant.pronouns && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({participant.pronouns})
              </span>
            )}
          </h1>
          {participant.ndisNumber && (
            <p className="mt-1 text-sm text-muted-foreground">
              NDIS #{participant.ndisNumber}
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ContactRow label="Email" value={participant.email} />
            <ContactRow label="Phone" value={participant.phone} />
            <ContactRow
              label="Date of birth"
              value={
                participant.dateOfBirth
                  ? format(participant.dateOfBirth, "d MMM yyyy")
                  : null
              }
            />
            <Separator />
            <ContactRow
              label="Added"
              value={format(participant.createdAt, "d MMM yyyy")}
            />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {activePlan ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Active NDIS plan</CardTitle>
                <CardDescription>
                  {format(activePlan.startDate, "d MMM yyyy")} —{" "}
                  {format(activePlan.endDate, "d MMM yyyy")}
                  {activePlan.ndisPlanNumber && (
                    <span className="ml-2 text-muted-foreground">
                      · {activePlan.ndisPlanNumber}
                    </span>
                  )}
                </CardDescription>
                <CardAction>
                  <Badge variant="secondary">
                    {formatCents(activePlan.totalCents)} total
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {(["CORE", "CAPACITY", "CAPITAL"] as const).map((cat) => {
                  const bucket = activePlan.budgets.find(
                    (b) => b.category === cat
                  );
                  const total = bucket?.totalCents ?? 0;
                  const spent = bucket?.spentCents ?? 0;
                  const pct = total > 0 ? (spent / total) * 100 : 0;
                  const remaining = total - spent;

                  return (
                    <div key={cat} className="space-y-2">
                      <div className="flex items-baseline justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium">
                            {BUCKET_LABEL[cat]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {BUCKET_HINT[cat]}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {formatCents(spent)}{" "}
                            <span className="text-muted-foreground">
                              / {formatCents(total)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCents(remaining)} remaining
                          </div>
                        </div>
                      </div>
                      <Progress value={pct} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>No active plan</CardTitle>
                    <CardDescription>
                      Add the NDIS plan so you can track spend across Core,
                      Capacity and Capital.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  render={
                    <Link
                      href={`/provider/participants/${participant.id}/plans/new`}
                    />
                  }
                >
                  <Plus />
                  Add NDIS plan
                </Button>
              </CardContent>
            </Card>
          )}

          {participant.plans.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Plan history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {participant.plans
                  .filter((p) => p.id !== activePlan?.id)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between"
                    >
                      <span>
                        {format(p.startDate, "d MMM yyyy")} –{" "}
                        {format(p.endDate, "d MMM yyyy")}
                      </span>
                      <Badge variant="outline">{p.status.toLowerCase()}</Badge>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Service agreement — Phase 2 of the lifecycle */}
          {activeAgreement ? (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileSignature className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>Service agreement</CardTitle>
                    <CardDescription>
                      {format(activeAgreement.startDate, "d MMM yyyy")}
                      {activeAgreement.endDate &&
                        ` – ${format(activeAgreement.endDate, "d MMM yyyy")}`}
                    </CardDescription>
                  </div>
                </div>
                <CardAction>
                  <Badge
                    variant={
                      AGREEMENT_STATUS_VARIANT[activeAgreement.status]
                    }
                  >
                    {activeAgreement.status.toLowerCase()}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Signed</span>
                  <span className="text-right">
                    {activeAgreement.signedAt
                      ? format(activeAgreement.signedAt, "d MMM yyyy")
                      : "Not yet"}
                  </span>
                </div>
                {activeAgreement.uploadedFileKey && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      Uploaded file
                    </span>
                    <a
                      href={`/api/uploads/${activeAgreement.uploadedFileKey}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      <span className="truncate max-w-[180px]">
                        {activeAgreement.uploadedFileName ?? "Open file"}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
                {activeAgreement.documentUrl && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      External link
                    </span>
                    <a
                      href={activeAgreement.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {activeAgreement.notes && (
                  <>
                    <Separator />
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {activeAgreement.notes}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileSignature className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>No service agreement</CardTitle>
                    <CardDescription>
                      Phase 2 of the lifecycle — every participant needs one
                      to satisfy NDIS audit.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {canEdit && (
                <CardContent>
                  <Button
                    render={
                      <Link
                        href={`/provider/participants/${participant.id}/agreements/new`}
                      />
                    }
                  >
                    <Plus />
                    Add agreement
                  </Button>
                </CardContent>
              )}
            </Card>
          )}

          {/* Care plan + goals — Phase 3 of the lifecycle */}
          {carePlan ? (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <HeartPulse className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>Care plan</CardTitle>
                    <CardDescription>
                      {carePlan.effectiveFrom
                        ? `${format(carePlan.effectiveFrom, "d MMM yyyy")}${
                            carePlan.effectiveTo
                              ? ` – ${format(carePlan.effectiveTo, "d MMM yyyy")}`
                              : ""
                          }`
                        : "No dates set"}
                    </CardDescription>
                  </div>
                </div>
                <CardAction>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {carePlan.status.toLowerCase()}
                    </Badge>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <Link
                            href={`/provider/participants/${participant.id}/care-plan/edit`}
                          />
                        }
                      >
                        <Pencil />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {carePlan.summary && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {carePlan.summary}
                  </p>
                )}

                <CarePlanContext carePlan={carePlan} />

                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold">Goals</h3>
                    <span className="text-xs text-muted-foreground">
                      {carePlan.goals.length} total
                    </span>
                  </div>

                  {carePlan.goals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No goals yet — add the first one to map shift notes
                      against outcomes.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {carePlan.goals.map((g) => (
                        <li
                          key={g.id}
                          className="rounded-md border bg-muted/30 px-3 py-2"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <span className="text-sm font-medium">
                              {g.title}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {GOAL_CATEGORY_LABEL[g.category]}
                              </Badge>
                              <Badge variant={GOAL_STATUS_VARIANT[g.status]}>
                                {GOAL_STATUS_LABEL[g.status]}
                              </Badge>
                            </div>
                          </div>
                          {g.description && (
                            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                              {g.description}
                            </p>
                          )}
                          {g.targetDate && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Target: {format(g.targetDate, "d MMM yyyy")}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {canEdit && <AddGoalForm carePlanId={carePlan.id} />}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <HeartPulse className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>No care plan</CardTitle>
                    <CardDescription>
                      Phase 3 of the lifecycle. Capture goals so shift notes
                      can map to outcomes for next year&apos;s evidence pack.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              {canEdit && (
                <CardContent>
                  <Button
                    render={
                      <Link
                        href={`/provider/participants/${participant.id}/care-plan/new`}
                      />
                    }
                  >
                    <Plus />
                    Create care plan
                  </Button>
                </CardContent>
              )}
            </Card>
          )}

          {/* Behaviour Support Plan — separate clinical document, view-only
              for support workers per Q3 (2026-05-11). */}
          {!bsp && canEdit && (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>No Behaviour Support Plan</CardTitle>
                    <CardDescription>
                      Add one if the participant&apos;s behaviour support
                      needs a structured plan. Triggers, de-escalation, and
                      what NOT to do.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  render={
                    <Link
                      href={`/provider/participants/${participant.id}/bsp/new`}
                    />
                  }
                >
                  <Plus />
                  Add BSP
                </Button>
              </CardContent>
            </Card>
          )}
          {bsp && (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>Behaviour Support Plan</CardTitle>
                    <CardDescription>
                      Written by the behaviour support practitioner. Read-only
                      for support workers.
                    </CardDescription>
                  </div>
                </div>
                <CardAction>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {bsp.status.toLowerCase()}
                    </Badge>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        render={
                          <Link
                            href={`/provider/participants/${participant.id}/bsp/edit`}
                          />
                        }
                      >
                        <Pencil />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {bsp.summary && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {bsp.summary}
                  </p>
                )}
                <Field
                  icon={ShieldAlert}
                  label="Triggers"
                  value={bsp.triggers}
                />
                <Field
                  icon={Sparkles}
                  label="De-escalation strategies"
                  value={bsp.deescalation}
                />
                <Field
                  icon={AlertOctagon}
                  label="What NOT to do"
                  value={bsp.whatNotToDo}
                  emphasised
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function CarePlanContext({
  carePlan,
}: {
  carePlan: {
    communicationPreferences: string | null;
    medicalConditions: string | null;
    allergies: string | null;
    risks: string | null;
    emergencyContacts: string | null;
    culturalConsiderations: string | null;
  };
}) {
  const hasAny =
    carePlan.communicationPreferences ||
    carePlan.medicalConditions ||
    carePlan.allergies ||
    carePlan.risks ||
    carePlan.emergencyContacts ||
    carePlan.culturalConsiderations;
  if (!hasAny) return null;

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <h3 className="text-sm font-semibold">Context for support workers</h3>
      <Field
        icon={MessageCircle}
        label="Communication preferences"
        value={carePlan.communicationPreferences}
      />
      <Field
        icon={Pill}
        label="Medical conditions"
        value={carePlan.medicalConditions}
      />
      <Field
        icon={AlertOctagon}
        label="Allergies"
        value={carePlan.allergies}
        emphasised
      />
      <Field icon={ShieldAlert} label="Risks" value={carePlan.risks} />
      <Field
        icon={Phone}
        label="Emergency contacts"
        value={carePlan.emergencyContacts}
      />
      <Field
        icon={Sparkles}
        label="Cultural considerations"
        value={carePlan.culturalConsiderations}
      />
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  emphasised,
}: {
  icon: typeof HeartPulse;
  label: string;
  value: string | null;
  emphasised?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-2.5">
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${
          emphasised ? "text-destructive" : "text-muted-foreground"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm whitespace-pre-wrap">{value}</p>
      </div>
    </div>
  );
}

function ContactRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}