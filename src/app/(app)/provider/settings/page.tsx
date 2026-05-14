import Link from "next/link";
import { format } from "date-fns";
import { Mail, UserPlus, Users } from "lucide-react";

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
import { requireManager } from "@/lib/rbac";

import { RevokeInviteButton } from "./revoke-invite-button";

export default async function ProviderSettingsPage() {
  const context = await resolvePortalContext("provider");
  requireManager(context);
  const orgId = context.activeOrg.id;
  const now = new Date();

  const workers = await db.worker.findMany({
    where: { orgId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
      createdAt: true,
      invites: {
        where: { acceptedAt: null, expiresAt: { gt: now } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, expiresAt: true, createdAt: true },
      },
      participantAccess: {
        select: {
          participant: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const active = workers.filter((w) => w.userId !== null);
  const pending = workers.filter(
    (w) => w.userId === null && w.invites.length > 0
  );

  const orgName = context.activeOrg.tradingName ?? context.activeOrg.legalName;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your provider company details and access.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Worker Connections</CardTitle>
                <CardDescription>
                  Invite workers to {orgName} and control their access to
                  incident logging.
                </CardDescription>
              </div>
            </div>
            <Button render={<Link href="/provider/settings/invite-worker" />}>
              <UserPlus />
              Invite Worker
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Section
        title="Active"
        count={active.length}
        tone="good"
        empty="No workers have accepted their invites yet."
      >
        {active.map((w) => (
          <li key={w.id}>
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {w.firstName} {w.lastName}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-emerald-300 bg-emerald-50 text-emerald-800"
                  >
                    Active
                  </Badge>
                </div>
                {w.email && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {w.email}
                  </p>
                )}
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Joined {format(w.createdAt, "dd/MM/yyyy")}
                </p>
                {w.participantAccess.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Access:
                    </span>
                    {w.participantAccess.map((wp) => (
                      <Badge
                        key={wp.participant.id}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {wp.participant.firstName} {wp.participant.lastName}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                render={<Link href={`/provider/workers/${w.id}`} />}
              >
                View
              </Button>
            </div>
          </li>
        ))}
      </Section>

      <Section
        title="Pending"
        count={pending.length}
        tone="warn"
        empty="No pending invites."
      >
        {pending.map((w) => {
          const invite = w.invites[0];
          return (
            <li key={w.id}>
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-white p-4 shadow-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {w.firstName} {w.lastName}
                    </p>
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-amber-800"
                    >
                      Pending
                    </Badge>
                  </div>
                  {w.email && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {w.email}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Invited {format(invite.createdAt, "dd/MM/yyyy")} · expires{" "}
                    {format(invite.expiresAt, "dd/MM/yyyy")}
                  </p>
                  {w.participantAccess.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Access:
                      </span>
                      {w.participantAccess.map((wp) => (
                        <Badge
                          key={wp.participant.id}
                          variant="secondary"
                          className="text-[10px]"
                        >
                          {wp.participant.firstName} {wp.participant.lastName}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <RevokeInviteButton workerId={w.id} />
              </div>
            </li>
          );
        })}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  tone,
  empty,
  children,
}: {
  title: string;
  count: number;
  tone: "good" | "warn";
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge
          variant="outline"
          className={
            tone === "good"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-amber-300 bg-amber-50 text-amber-800"
          }
        >
          {count}
        </Badge>
      </div>
      {count === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {empty}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}