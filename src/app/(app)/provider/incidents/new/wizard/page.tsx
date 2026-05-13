import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

import { ComplianceWizard } from "./compliance-wizard";

export default async function ComplianceWizardPage() {
  const context = await resolvePortalContext("provider");
  const participants = await db.participant.findMany({
    where: { orgId: context.activeOrg.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <ComplianceWizard
      participants={participants.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
      }))}
    />
  );
}