import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { format, differenceInCalendarDays } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
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
import { formatCents } from "@/lib/utils";
import { resolvePortalContext } from "@/lib/session";

export default async function SCParticipantsPage() {
  const context = await resolvePortalContext("sc");
  const now = new Date();

  const participants = await db.participant.findMany({
    where: { orgId: context.activeOrg.id },
    include: {
      plans: {
        where: { status: "ACTIVE" },
        include: { budgets: true },
        orderBy: { startDate: "desc" },
        take: 1,
      },
      engagements: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
      escalations: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        select: { id: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone you coordinate care for. Click a row for plan, providers,
            and budget.
          </p>
        </div>
        <Button render={<Link href="/sc/participants/new" />}>
          <Plus />
          New participant
        </Button>
      </header>

      {participants.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>No participants yet</CardTitle>
                <CardDescription>
                  Add your first participant to start coordinating their care.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/sc/participants/new" />}>
              <Plus />
              Add participant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>NDIS #</TableHead>
                  <TableHead>Plan ends</TableHead>
                  <TableHead className="text-right">Budget left</TableHead>
                  <TableHead className="text-right">Providers</TableHead>
                  <TableHead className="text-right">Open issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participants.map((p) => {
                  const plan = p.plans[0];
                  const totalRemaining = plan
                    ? plan.budgets.reduce(
                        (a, b) => a + (b.totalCents - b.spentCents),
                        0
                      )
                    : 0;
                  const daysToEnd = plan
                    ? differenceInCalendarDays(plan.endDate, now)
                    : null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/sc/participants/${p.id}`}
                          className="hover:underline"
                        >
                          {p.firstName} {p.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.ndisNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        {plan ? (
                          <span
                            className={
                              daysToEnd !== null && daysToEnd < 30
                                ? "text-amber-700"
                                : ""
                            }
                          >
                            {format(plan.endDate, "d MMM yyyy")}
                            {daysToEnd !== null && daysToEnd >= 0 && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({daysToEnd}d)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            no active plan
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {plan ? formatCents(totalRemaining) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{p.engagements.length}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {p.escalations.length > 0 ? (
                          <Badge variant="destructive">
                            {p.escalations.length}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}