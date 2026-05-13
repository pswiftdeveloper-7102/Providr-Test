import { Building2, LogOut, Mail, User } from "lucide-react";

import { appSignOutAction } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { resolvePortalContext } from "@/lib/session";

export default async function AppProfilePage() {
  const context = await resolvePortalContext("provider");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your account and organisation.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-3 pt-6 text-sm">
          <Row icon={User} label="Name">
            {context.user.name ?? "—"}
          </Row>
          <Separator />
          <Row icon={Mail} label="Email">
            {context.user.email ?? "—"}
          </Row>
          <Separator />
          <Row icon={Building2} label="Organisation">
            {context.activeOrg.tradingName ?? context.activeOrg.legalName}
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need more than incidents?</CardTitle>
          <CardDescription>
            Open Providr on desktop for the full provider portal —
            rostering, care plans, reviews, audit pack, and more.
          </CardDescription>
        </CardHeader>
      </Card>

      <form action={appSignOutAction}>
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="w-full"
        >
          <LogOut />
          Sign out
        </Button>
      </form>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  );
}