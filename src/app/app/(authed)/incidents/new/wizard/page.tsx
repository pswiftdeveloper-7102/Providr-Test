import { getAccessibleParticipants } from "@/lib/participant-access";
import { resolvePortalContext } from "@/lib/session";

import { AppWizard } from "./app-wizard";

export default async function AppWizardPage() {
  const context = await resolvePortalContext("provider");
  const participants = await getAccessibleParticipants(context);

  return (
    <AppWizard
      participants={participants.map((p) => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
      }))}
    />
  );
}