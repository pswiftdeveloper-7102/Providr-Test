import Link from "next/link";
import { MessageCircle, Trash2 } from "lucide-react";
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
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { PageNav } from "@/components/page-nav";
import { ListSearch } from "@/components/list-search";

import { CommunicationLogForm } from "./log-form";
import { deleteCommunicationAction } from "./actions";

const PER_PAGE = 25;

const CHANNEL_LABEL: Record<string, string> = {
  PHONE: "Phone",
  EMAIL: "Email",
  SMS: "SMS",
  IN_PERSON: "In person",
  VIDEO: "Video",
  OTHER: "Other",
};

export default async function SCCommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const context = await resolvePortalContext("sc");
  const { page: pageParam, q: qParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const q = (qParam ?? "").trim();

  const where = {
    orgId: context.activeOrg.id,
    ...(q
      ? {
          OR: [
            { withParty: { contains: q, mode: "insensitive" as const } },
            { summary: { contains: q, mode: "insensitive" as const } },
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
  const [participants, logs, total] = await Promise.all([
    db.participant.findMany({
      where: { orgId: context.activeOrg.id },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.communicationLog.findMany({
      where,
      include: {
        participant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    db.communicationLog.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Communications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calls, emails, in-person — your interrupt-driven day, captured.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Log a touchpoint</CardTitle>
          <CardDescription>
            One quick form, any participant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CommunicationLogForm participants={participants} />
        </CardContent>
      </Card>

      <ListSearch
        placeholder="Search by participant, party, or content"
        defaultValue={q}
      />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Recent</CardTitle>
          <CardDescription>Across all participants.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing logged yet.
            </p>
          ) : (
            <ul className="divide-y">
              {logs.map((l) => (
                <li key={l.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/sc/participants/${l.participant.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {l.participant.firstName} {l.participant.lastName}
                    </Link>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {l.direction.toLowerCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        <MessageCircle className="mr-1 h-3 w-3" />
                        {CHANNEL_LABEL[l.channel]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(l.occurredAt, "dd/MM h:mm a")}
                      </span>
                      <form
                        action={deleteCommunicationAction.bind(null, l.id)}
                      >
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          aria-label="Delete log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </form>
                    </div>
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">With:</span>{" "}
                    {l.withParty}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{l.summary}</p>
                  {l.followUp && (
                    <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                      <span className="font-medium">Follow-up:</span>{" "}
                      {l.followUp}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PageNav
        page={page}
        perPage={PER_PAGE}
        total={total}
        preserve={{ q: q || undefined }}
      />
    </div>
  );
}