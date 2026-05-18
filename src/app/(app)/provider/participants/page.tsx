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
import { PageNav } from "@/components/page-nav";
import { ListSearch } from "@/components/list-search";

const PER_PAGE = 25;

export default async function ParticipantsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const context = await resolvePortalContext("provider");
  const { page: pageParam, q: qParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const q = (qParam ?? "").trim();

  const where = {
    orgId: context.activeOrg.id,
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { ndisNumber: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [participants, total] = await Promise.all([
    db.participant.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: {
        plans: {
          where: { status: "ACTIVE" },
          orderBy: { startDate: "desc" },
          take: 1,
          include: { budgets: true },
        },
      },
    }),
    db.participant.count({ where }),
  ]);

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

      <ListSearch
        placeholder="Search by name or NDIS number"
        defaultValue={q}
      />

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

      <PageNav
        page={page}
        perPage={PER_PAGE}
        total={total}
        preserve={{ q: q || undefined }}
      />
    </div>
  );
}