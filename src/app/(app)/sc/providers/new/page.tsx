import { resolvePortalContext } from "@/lib/session";
import { requireCoordinatorOrRedirect } from "../../_helpers";

import { ProviderForm } from "../provider-form";

export default async function NewProviderPage() {
  const context = await resolvePortalContext("sc");
  requireCoordinatorOrRedirect(context, "/sc");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          New provider
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Add a provider to your directory
        </h1>
      </header>

      <ProviderForm cancelHref="/sc/providers" />
    </div>
  );
}