import Link from "next/link";
import { ArrowRight, HeartPulse, Users } from "lucide-react";
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

const STATUS_VARIANT: Record<
  "DRAFT" | "ACTIVE" | "ARCHIVED",
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  ACTIVE: "secondary",
  ARCHIVED: "outline",
};

const REVIEW_HORIZON_DAYS = 60;

export default async function CarePlansPage() {
  const context = await resolvePortalContext("provider");
  requireManager(context);

  const orgId = context.activeOrg.id;
  const now = new Date();

  // Pull care plans for the active org plus participants who don't have a
  // current one — managers want both "what's in flight" and "who's missing
  // a plan" in one view.
  const [carePlans, participantsWithoutPlan] = await Promise.all([
    db.carePlan.findMany({
      where: { orgId, status: { in: ["DRAFT", "ACTIVE"] } },
      include: {
        participant: {
          select: { id: true, firstName: true, lastName: true },
        },
        _count: { select: { goals: true } },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    }),
    db.participant.findMany({
      where: {
        orgId,
        carePlans: { none: { status: { in: ["DRAFT", "ACTIVE"] } } },
      },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Care plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One row per participant. Phase 3 of the lifecycle — the
            document that turns the NDIS plan into actual hours, workers,
            and goals.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <HeartPulse className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Active & draft plans</CardTitle>
              <CardDescription>
                Plans currently in play across the caseload.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Badge variant={carePlans.length > 0 ? "secondary" : "outline"}>
              {carePlans.length}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          {carePlans.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No active or draft care plans yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead className="text-right">Goals</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {carePlans.map((cp) => {
                  const daysToEnd =
                    cp.effectiveTo &&
                    differenceInCalendarDays(cp.effectiveTo, now);
                  const urgent =
                    daysToEnd !== null &&
                    daysToEnd !== undefined &&
                    daysToEnd >= 0 &&
                    daysToEnd <= REVIEW_HORIZON_DAYS;
                  return (
                    <TableRow key={cp.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/provider/participants/${cp.participant.id}`}
                          className="hover:underline"
                        >
                          {cp.participant.firstName}{" "}
                          {cp.participant.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[cp.status]}>
                          {cp.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {cp.effectiveFrom || cp.effectiveTo ? (
                          <span
                            className={urgent ? "text-amber-700" : undefined}
                          >
                            {cp.effectiveFrom &&
                              format(cp.effectiveFrom, "dd/MM/yyyy")}
                            {cp.effectiveTo && " — "}
                            {cp.effectiveTo &&
                              format(cp.effectiveTo, "dd/MM/yyyy")}
                            {urgent && daysToEnd !== null && (
                              <span className="ml-1 text-xs">
                                ({daysToEnd}d)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            no dates
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{cp._count.goals}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(cp.updatedAt, "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          render={
                            <Link
                              href={`/provider/participants/${cp.participant.id}/care-plan/edit`}
                            />
                          }
                          aria-label="Edit care plan"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {participantsWithoutPlan.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Participants without a care plan</CardTitle>
                <CardDescription>
                  Phase 3 hasn&apos;t started. Create a care plan before
                  shifts can map to outcomes.
                </CardDescription>
              </div>
            </div>
            <CardAction>
              <Badge variant="destructive">
                {participantsWithoutPlan.length}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {participantsWithoutPlan.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/provider/participants/${p.id}/care-plan/new`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    <span className="text-sm font-medium">
                      {p.firstName} {p.lastName}
                    </span>
                    <Button size="sm" variant="ghost">
                      Create plan
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}