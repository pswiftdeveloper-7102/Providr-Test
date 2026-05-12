import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ClipboardCheck,
  FileText,
  MessageCircle,
  Pencil,
  Plus,
  Wallet,
} from "lucide-react";

import { NetworkSection } from "./network/network-section";
import { CommunicationLogForm } from "../../communications/log-form";
import { toggleComplexNeedsAction } from "../actions";
import { format, differenceInCalendarDays } from "date-fns";

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
import { formatCents } from "@/lib/utils";
import { resolvePortalContext } from "@/lib/session";

const BUCKET_LABEL: Record<"CORE" | "CAPACITY" | "CAPITAL", string> = {
  CORE: "Core supports",
  CAPACITY: "Capacity building",
  CAPITAL: "Capital",
};

const ENGAGEMENT_STATUS_LABEL: Record<string, string> = {
  PROPOSED: "Proposed",
  AGREEMENT_SENT: "Agreement sent",
  ACTIVE: "Active",
  ENDED: "Ended",
  DECLINED: "Declined",
};

const ENGAGEMENT_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PROPOSED: "outline",
  AGREEMENT_SENT: "secondary",
  ACTIVE: "default",
  ENDED: "outline",
  DECLINED: "destructive",
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

export default async function SCParticipantDetailPage({
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
        orderBy: { startDate: "desc" },
        include: { budgets: true },
      },
      engagements: {
        orderBy: { createdAt: "desc" },
        include: {
          externalProvider: {
            select: { id: true, name: true },
          },
        },
      },
      escalations: {
        orderBy: { openedAt: "desc" },
        take: 20,
      },
      informalSupports: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
      externalContacts: {
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      },
      communicationLogs: {
        orderBy: { occurredAt: "desc" },
        take: 10,
      },
    },
  });
  if (!participant) notFound();

  const activePlan = participant.plans.find((p) => p.status === "ACTIVE");

  // Pull spend entries for the active plan's buckets, plus most recent
  // entries across all buckets for the activity feed.
  const planBudgetIds = activePlan
    ? activePlan.budgets.map((b) => b.id)
    : [];
  const recentSpend = planBudgetIds.length
    ? await db.spendEntry.findMany({
        where: { planBudgetId: { in: planBudgetIds } },
        orderBy: { occurredAt: "desc" },
        take: 10,
        include: {
          planBudget: { select: { category: true } },
        },
      })
    : [];

  const totalRemaining = activePlan
    ? activePlan.budgets.reduce(
        (a, b) => a + (b.totalCents - b.spentCents),
        0
      )
    : 0;

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href="/sc/participants" />}
      >
        <ArrowLeft />
        All participants
      </Button>

      <header className="flex flex-wrap items-end justify-between gap-3">
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
          {participant.complexNeeds && (
            <Badge variant="secondary" className="mt-2">
              Complex needs
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={toggleComplexNeedsAction.bind(null, participant.id)}>
            <Button variant="outline" size="sm" type="submit">
              {participant.complexNeeds
                ? "Clear complex-needs flag"
                : "Mark complex needs"}
            </Button>
          </form>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/sc/participants/${participant.id}/statements`} />
            }
          >
            <FileText />
            Monthly statement
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={
              <Link href={`/sc/participants/${participant.id}/evidence`} />
            }
          >
            <ClipboardCheck />
            Evidence pack
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Email" value={participant.email} />
            <Row label="Phone" value={participant.phone} />
            <Row
              label="DOB"
              value={
                participant.dateOfBirth
                  ? format(participant.dateOfBirth, "d MMM yyyy")
                  : null
              }
            />
            <Row label="Address" value={participant.address} />
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* SC Job 1 — Read the plan */}
          {activePlan ? (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
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
                  </div>
                </div>
                <CardAction>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {formatCents(totalRemaining)} left
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      render={
                        <Link
                          href={`/sc/participants/${participant.id}/plans/${activePlan.id}/edit`}
                        />
                      }
                    >
                      <Pencil />
                      Edit
                    </Button>
                  </div>
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
                    <div key={cat}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">
                          {BUCKET_LABEL[cat]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatCents(spent)} of {formatCents(total)} ·{" "}
                          {formatCents(remaining)} left
                        </span>
                      </div>
                      <Progress value={pct} className="mt-1.5" />
                    </div>
                  );
                })}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    render={
                      <Link
                        href={`/sc/participants/${participant.id}/spend/new`}
                      />
                    }
                  >
                    <Wallet />
                    Log spend
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle>No active NDIS plan</CardTitle>
                    <CardDescription>
                      Capture the plan to unlock budget tracking and the
                      evidence pack.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  render={
                    <Link
                      href={`/sc/participants/${participant.id}/plans/new`}
                    />
                  }
                >
                  <Plus />
                  Add plan
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Scene A — informal supports + external system contacts */}
          <NetworkSection
            participantId={participant.id}
            informalSupports={participant.informalSupports}
            externalContacts={participant.externalContacts}
          />

          {/* Communication log — Scene C */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Communication log</CardTitle>
                  <CardDescription>
                    Calls, emails, in-person touchpoints — for this participant.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <CommunicationLogForm
                participants={[
                  {
                    id: participant.id,
                    firstName: participant.firstName,
                    lastName: participant.lastName,
                  },
                ]}
                defaultParticipantId={participant.id}
              />
              {participant.communicationLogs.length > 0 && (
                <>
                  <Separator />
                  <ul className="space-y-2">
                    {participant.communicationLogs.map((l) => (
                      <li
                        key={l.id}
                        className="rounded-md border bg-muted/30 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">
                            {l.withParty}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {l.direction.toLowerCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {l.channel.toLowerCase().replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(l.occurredAt, "d MMM h:mm a")}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-sm whitespace-pre-wrap">
                          {l.summary}
                        </p>
                        {l.followUp && (
                          <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                            <span className="font-medium">Follow-up:</span>{" "}
                            {l.followUp}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          {/* SC Job 3 — Set up the team (engagements) */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Providers in play</CardTitle>
                  <CardDescription>
                    Who&apos;s delivering what right now, and what&apos;s in
                    flight.
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link
                      href={`/sc/participants/${participant.id}/engagements/new`}
                    />
                  }
                >
                  <Plus />
                  Engage provider
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              {participant.engagements.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Nobody engaged yet. Pick from your provider directory.
                </p>
              ) : (
                <ul className="divide-y">
                  {participant.engagements.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <Link
                        href={`/sc/providers/${e.externalProvider.id}`}
                        className="min-w-0 flex-1 hover:underline"
                      >
                        <div className="text-sm font-medium">
                          {e.externalProvider.name}
                        </div>
                        {e.serviceSummary && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {e.serviceSummary}
                          </div>
                        )}
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={ENGAGEMENT_STATUS_VARIANT[e.status]}>
                          {ENGAGEMENT_STATUS_LABEL[e.status]}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Edit engagement"
                          render={
                            <Link
                              href={`/sc/participants/${participant.id}/engagements/${e.id}/edit`}
                            />
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* SC Job 5 — Handle crises (escalations) */}
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle>Escalations</CardTitle>
                  <CardDescription>
                    Things that needed (or still need) your attention.
                  </CardDescription>
                </div>
              </div>
              <CardAction>
                <Button
                  size="sm"
                  variant="outline"
                  render={
                    <Link
                      href={`/sc/participants/${participant.id}/escalations/new`}
                    />
                  }
                >
                  <Plus />
                  Log escalation
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              {participant.escalations.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Nothing to flag.
                </p>
              ) : (
                <ul className="divide-y">
                  {participant.escalations.map((esc) => {
                    const days = differenceInCalendarDays(esc.openedAt, now);
                    return (
                      <li key={esc.id} className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium">
                            {ESCALATION_TYPE_LABEL[esc.type]}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                esc.status === "OPEN"
                                  ? "destructive"
                                  : esc.status === "IN_PROGRESS"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-[10px]"
                            >
                              {esc.status.toLowerCase().replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.abs(days)}d ago
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                          {esc.description}
                        </p>
                        {esc.resolution && (
                          <>
                            <Separator className="my-2" />
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                              <span className="font-medium">Resolution:</span>{" "}
                              {esc.resolution}
                            </p>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* SC Job 4 — Watch the money (spend log) */}
          {recentSpend.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <CardTitle>Recent spend</CardTitle>
                </div>
                <CardDescription>
                  Latest entries against this plan&apos;s buckets.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {recentSpend.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/sc/participants/${participant.id}/spend/${s.id}/edit`}
                        className="block px-4 py-3 hover:bg-muted/40"
                      >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {s.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {s.providerName ? `${s.providerName} · ` : ""}
                            {BUCKET_LABEL[s.planBudget.category as keyof typeof BUCKET_LABEL]} ·{" "}
                            {format(s.occurredAt, "d MMM yyyy")}
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {formatCents(s.amountCents)}
                        </span>
                      </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}