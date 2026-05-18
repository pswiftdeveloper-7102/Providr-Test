import Link from "next/link";
import { AlertTriangle, Plus } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";

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
import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { PageNav } from "@/components/page-nav";
import { ListSearch } from "@/components/list-search";

const PER_PAGE = 20;

const TYPE_LABEL: Record<string, string> = {
  PROVIDER_DROP: "Provider drop",
  HOSPITAL: "Hospital",
  REPORTABLE_INCIDENT: "Reportable incident",
  FAMILY_ISSUE: "Family issue",
  EMERGENCY_COVER: "Emergency cover",
  PLAN_BREACH: "Plan breach",
  OTHER: "Other",
};

export default async function EscalationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const context = await resolvePortalContext("sc");
  const now = new Date();
  const { page: pageParam, q: qParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const q = (qParam ?? "").trim();

  const orgId = context.activeOrg.id;
  const resolvedWhere = {
    orgId,
    status: "RESOLVED" as const,
    ...(q
      ? {
          OR: [
            { description: { contains: q, mode: "insensitive" as const } },
            { resolution: { contains: q, mode: "insensitive" as const } },
            {
              participant: {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" as const } },
                  { lastName: { contains: q, mode: "insensitive" as const } },
                ],
              },
            },
          ],
        }
      : {}),
  };
  const [open, resolved, resolvedTotal] = await Promise.all([
    db.escalation.findMany({
      where: { orgId, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { openedAt: "desc" },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    db.escalation.findMany({
      where: resolvedWhere,
      orderBy: { resolvedAt: "desc" },
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.escalation.count({ where: resolvedWhere }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Escalations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            SC Job 5 — provider drops, hospital, incidents, family issues,
            emergency cover.
          </p>
        </div>
        <Button render={<Link href="/sc/escalations/new" />}>
          <Plus />
          Log escalation
        </Button>
      </header>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Open & in progress</CardTitle>
              <CardDescription>
                What still needs you. Resolve as you go.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Badge variant={open.length > 0 ? "destructive" : "outline"}>
              {open.length}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          {open.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing on fire. Take a breath.
            </p>
          ) : (
            <ul className="divide-y">
              {open.map((e) => {
                const days = differenceInCalendarDays(now, e.openedAt);
                return (
                  <li key={e.id}>
                    <Link
                      href={`/sc/escalations/${e.id}`}
                      className="block px-4 py-3 hover:bg-muted/40"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">
                          {e.participant.firstName} {e.participant.lastName}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {TYPE_LABEL[e.type]}
                          </Badge>
                          <Badge
                            variant={
                              e.status === "OPEN" ? "destructive" : "outline"
                            }
                            className="text-[10px]"
                          >
                            {e.status.toLowerCase().replace("_", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {days === 0 ? "today" : `${days}d ago`}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                        {e.description}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ListSearch
        placeholder="Search resolved by participant or description"
        defaultValue={q}
      />

      {resolvedTotal > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Resolved</CardTitle>
            <CardDescription>
              For your audit trail and the evidence pack.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {resolved.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/sc/escalations/${e.id}`}
                    className="block px-4 py-3 hover:bg-muted/40"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">
                        {e.participant.firstName} {e.participant.lastName}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {TYPE_LABEL[e.type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {e.resolvedAt && format(e.resolvedAt, "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {e.description}
                    </p>
                    {e.resolution && (
                      <>
                        <Separator className="my-2" />
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                          <span className="font-medium">Resolution:</span>{" "}
                          {e.resolution}
                        </p>
                      </>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <PageNav
        page={page}
        perPage={PER_PAGE}
        total={resolvedTotal}
        preserve={{ q: q || undefined }}
      />
    </div>
  );
}