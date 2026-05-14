import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAccessibleParticipants } from "@/lib/participant-access";
import { resolvePortalContext } from "@/lib/session";

import { AppQuickForm } from "./app-quick-form";

export default async function AppQuickPage() {
  const context = await resolvePortalContext("provider");
  const participants = await getAccessibleParticipants(context);

  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/app/incidents/new" />}
      >
        <ArrowLeft />
        Change type
      </Button>

      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Quick Report</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Essentials only — a supervisor will complete the full report.
          </p>
        </div>
      </header>

      <AppQuickForm
        participants={participants.map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
        }))}
      />
    </div>
  );
}