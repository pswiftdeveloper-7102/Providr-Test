import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { resolvePortalContext } from "@/lib/session";
import { requireManager } from "@/lib/rbac";

import { InviteWorkerForm } from "./invite-worker-form";

export default async function InviteWorkerPage() {
  const context = await resolvePortalContext("provider");
  requireManager(context);
  const orgName = context.activeOrg.tradingName ?? context.activeOrg.legalName;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/provider/settings" />}
      >
        <ArrowLeft />
        Back to Settings
      </Button>

      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Invite Worker
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate a one-time invite link for a new worker to join {orgName}.
          </p>
        </div>
      </header>

      <InviteWorkerForm />
    </div>
  );
}