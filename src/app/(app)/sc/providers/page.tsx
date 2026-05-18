import Link from "next/link";
import { Building2, Plus, Star } from "lucide-react";

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
import { resolvePortalContext } from "@/lib/session";
import { PageNav } from "@/components/page-nav";

import { ProviderFilters } from "./filters";

const PER_PAGE = 25;

export default async function SCProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const context = await resolvePortalContext("sc");

  const q = (sp.q ?? "").trim();
  const onlyAccepting = sp.filter === "accepting";
  const page = Math.max(1, Number(sp.page) || 1);

  const where = {
    orgId: context.activeOrg.id,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { serviceCategories: { contains: q, mode: "insensitive" as const } },
            { contactName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(onlyAccepting
      ? {
          capacityStatus: { contains: "accept", mode: "insensitive" as const },
        }
      : {}),
  };

  const [providers, total] = await Promise.all([
    db.externalProvider.findMany({
      where,
      include: {
        engagements: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.externalProvider.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Providers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your directory. SC Job 2 — find the right people for each
            participant.
          </p>
        </div>
        <Button render={<Link href="/sc/providers/new" />}>
          <Plus />
          Add provider
        </Button>
      </header>

      <Card>
        <CardContent className="py-3">
          <ProviderFilters defaultQ={q} defaultAccepting={onlyAccepting} />
        </CardContent>
      </Card>

      {providers.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>
                  {q || onlyAccepting
                    ? "No providers match"
                    : "Directory's empty"}
                </CardTitle>
                <CardDescription>
                  {q || onlyAccepting
                    ? "Try a different search or clear the filters."
                    : "Add the providers you work with so engagements are a click away."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          {!q && !onlyAccepting && (
            <CardContent>
              <Button render={<Link href="/sc/providers/new" />}>
                <Plus />
                Add the first one
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Service categories</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead className="text-right">Active engagements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/sc/providers/${p.id}`}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.serviceCategories ?? "—"}
                    </TableCell>
                    <TableCell>
                      {p.capacityStatus ? (
                        <Badge
                          variant={
                            p.capacityStatus.toLowerCase().includes("full")
                              ? "destructive"
                              : p.capacityStatus
                                    .toLowerCase()
                                    .includes("wait")
                                ? "secondary"
                                : "outline"
                          }
                          className="text-[10px]"
                        >
                          {p.capacityStatus}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.rating ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500" />
                          {p.rating}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{p.engagements.length}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PageNav
        page={page}
        perPage={PER_PAGE}
        total={total}
        preserve={{ q, filter: onlyAccepting ? "accepting" : undefined }}
      />
    </div>
  );
}