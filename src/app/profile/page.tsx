import { redirect } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, User, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      memberships: { include: { org: true } },
    },
  });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account details and organisations.
          </p>
        </div>
        <Button variant="outline" render={<Link href="/provider" />}>
          ← Back
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>You</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row icon={User} label="Name" value={user.name ?? "—"} />
          <Row icon={Mail} label="Email" value={user.email} />
          <Row icon={Phone} label="Phone" value={user.phone ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organisations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user.memberships.map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {m.org.tradingName ?? m.org.legalName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.roles.map((r) => r.replace(/_/g, " ").toLowerCase()).join(", ")}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string | null;
}) {
  return (
    <>
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-1 items-center justify-between gap-3">
          <span className="text-muted-foreground">{label}</span>
          <span className="text-right">{value ?? "—"}</span>
        </div>
      </div>
      <Separator />
    </>
  );
}