import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { resolvePortalContext } from "@/lib/session";
import { formatCents } from "@/lib/utils";

export default async function ParticipantsListPage() {
  const context = await resolvePortalContext("provider");

  const participants = await db.participant.findMany({
    where: { orgId: context.activeOrg.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      plans: {
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        take: 1,
        include: { budgets: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Participants
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            People your organisation supports.
          </p>
        </div>
        <Button render={<Link href="/provider/participants/new" />}>
          <Plus />
          New participant
        </Button>
      </header>

      {participants.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No participants yet</CardTitle>
            <CardDescription>
              Add the first participant to start building care plans, rosters,
              and shift records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/provider/participants/new" />}>
              <Plus />
              Add a participant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table className="min-w-[560px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>NDIS number</TableHead>
                <TableHead>Active plan</TableHead>
                <TableHead className="text-right">Plan total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((p) => {
                const activePlan = p.plans[0];
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/provider/participants/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.firstName} {p.lastName}
                      </Link>
                      {p.pronouns && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({p.pronouns})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.ndisNumber ?? "—"}
                    </TableCell>
                    <TableCell>
                      {activePlan ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">No plan</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {activePlan
                        ? formatCents(activePlan.totalCents)
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </Card>
      )}
    </div>
  );
}