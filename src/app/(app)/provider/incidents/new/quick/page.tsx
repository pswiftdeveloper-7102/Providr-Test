import { AlertTriangle } from "lucide-react";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

import { QuickReportForm } from "./quick-report-form";

export default async function QuickReportPage() {
  const context = await resolvePortalContext("provider");
  const orgId = context.activeOrg.id;

  const participants = await db.participant.findMany({
    where: { orgId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quick Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log the essentials now — a supervisor will complete the full report later.
          </p>
        </div>
      </header>

      <QuickReportForm
        participants={participants.map((p) => ({
          id: p.id,
          name: `${p.firstName} ${p.lastName}`,
        }))}
      />
    </div>
  );
}