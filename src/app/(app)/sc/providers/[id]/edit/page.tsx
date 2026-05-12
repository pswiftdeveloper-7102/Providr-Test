import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { requireCoordinatorOrRedirect } from "../../../_helpers";

import { ProviderForm } from "../../provider-form";

export default async function EditProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await resolvePortalContext("sc");
  requireCoordinatorOrRedirect(context, "/sc");

  const provider = await db.externalProvider.findFirst({
    where: { id, orgId: context.activeOrg.id },
  });
  if (!provider) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Edit provider
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {provider.name}
        </h1>
      </header>

      <ProviderForm
        providerId={provider.id}
        cancelHref={`/sc/providers/${provider.id}`}
        values={{
          name: provider.name,
          abn: provider.abn,
          ndisRegistrationNumber: provider.ndisRegistrationNumber,
          serviceCategories: provider.serviceCategories,
          rating: provider.rating,
          capacityStatus: provider.capacityStatus,
          rateNotes: provider.rateNotes,
          contactName: provider.contactName,
          contactEmail: provider.contactEmail,
          contactPhone: provider.contactPhone,
          notes: provider.notes,
        }}
      />
    </div>
  );
}