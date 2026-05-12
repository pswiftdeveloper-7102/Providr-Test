import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireManager } from "@/lib/rbac";
import { transportStatus } from "@/lib/notifications/transport";

import { ComplianceContactForm } from "./compliance-contact-form";

export default async function CompliancePage() {
  const context = await resolvePortalContext("provider");
  requireManager(context);

  const existing = await db.orgComplianceContact.findUnique({
    where: { orgId: context.activeOrg.id },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Notifications
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Compliance contact
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reportable incidents are routed to your org&apos;s admins by default.
          Add a Commission contact below to also notify them by email and SMS
          when the 24-hour NDIS clock starts.
        </p>
      </header>

      <ComplianceContactForm
        initial={{
          name: existing?.name ?? "",
          role: existing?.role ?? "",
          email: existing?.email ?? "",
          phone: existing?.phone ?? "",
          notes: existing?.notes ?? "",
        }}
        transportStatus={transportStatus}
      />
    </div>
  );
}