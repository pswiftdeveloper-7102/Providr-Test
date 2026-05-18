import { Plus } from "lucide-react";
import Link from "next/link";
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
import {
  CERT_LABEL,
  certStatus,
  worstStatus,
  type CertStatus,
} from "@/lib/certificates";
import { WORKER_TYPE_LABEL } from "@/lib/worker-type";
import { PageNav } from "@/components/page-nav";
import { ListSearch } from "@/components/list-search";

const PER_PAGE = 25;

function StatusBadge({ status }: { status: CertStatus }) {
  if (status === "expired") {
    return <Badge variant="destructive">{CERT_LABEL[status]}</Badge>;
  }
  if (status === "expiring") {
    return (
      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
        {CERT_LABEL[status]}
      </Badge>
    );
  }
  if (status === "active") {
    return <Badge variant="secondary">{CERT_LABEL[status]}</Badge>;
  }
  return <Badge variant="outline">{CERT_LABEL[status]}</Badge>;
}

export default async function WorkersListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const context = await resolvePortalContext("provider");
  requireManager(context);
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
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [workers, total] = await Promise.all([
    db.worker.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.worker.count({ where }),
  ]);

  const now = new Date();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Support workers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            People on the front line. Keep their NDIS Worker Check and First
            Aid certificates current — expired workers can&apos;t be rostered.
          </p>
        </div>
        <Button render={<Link href="/provider/workers/new" />}>
          <Plus />
          New worker
        </Button>
      </header>

      <ListSearch
        placeholder="Search by name or email"
        defaultValue={q}
      />

      {workers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No workers yet</CardTitle>
            <CardDescription>
              Add the first support worker to start rostering shifts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/provider/workers/new" />}>
              <Plus />
              Add a worker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>NDIS check</TableHead>
                <TableHead>First Aid</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.map((w) => {
                const ndis = certStatus(w.ndisWorkerCheckExpiry, now);
                const firstAid = certStatus(w.firstAidExpiry, now);
                const overall = worstStatus(ndis, firstAid);
                return (
                  <TableRow key={w.id}>
                    <TableCell>
                      <Link
                        href={`/provider/workers/${w.id}`}
                        className="font-medium hover:underline"
                      >
                        {w.firstName} {w.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {WORKER_TYPE_LABEL[w.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {w.email ?? w.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <CertCell
                        status={ndis}
                        expiry={w.ndisWorkerCheckExpiry}
                      />
                    </TableCell>
                    <TableCell>
                      <CertCell status={firstAid} expiry={w.firstAidExpiry} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={overall} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
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

function CertCell({
  status,
  expiry,
}: {
  status: CertStatus;
  expiry: Date | null;
}) {
  if (status === "unset") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const tone =
    status === "expired"
      ? "text-destructive"
      : status === "expiring"
        ? "text-amber-700"
        : "text-muted-foreground";
  return (
    <span className={`text-xs ${tone}`}>
      {expiry ? format(expiry, "dd/MM/yyyy") : "—"}
    </span>
  );
}