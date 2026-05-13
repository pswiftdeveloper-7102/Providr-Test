import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

import { AppWizard } from "./app-wizard";

export default async function AppWizardPage() {
  const context = await resolvePortalContext("provider");
  const participants = await db.participant.findMany({
    where: { orgId: context.activeOrg.id },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <AppWizard
      participants={participants.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
      }))}
    />
  );
}