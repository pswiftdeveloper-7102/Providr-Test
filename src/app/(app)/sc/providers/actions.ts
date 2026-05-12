"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertCoordinator } from "@/lib/rbac";

const providerSchema = z.object({
  name: z.string().trim().min(1, "Provider name is required."),
  abn: z.string().trim().optional().or(z.literal("")),
  ndisRegistrationNumber: z.string().trim().optional().or(z.literal("")),
  serviceCategories: z.string().trim().optional().or(z.literal("")),
  rating: z.string().optional().or(z.literal("")),
  capacityStatus: z.string().trim().optional().or(z.literal("")),
  rateNotes: z.string().trim().optional().or(z.literal("")),
  contactName: z.string().trim().optional().or(z.literal("")),
  contactEmail: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  contactPhone: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type ProviderFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseRating(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > 5) return null;
  return n;
}

function parseForm(formData: FormData) {
  return providerSchema.safeParse({
    name: formData.get("name"),
    abn: formData.get("abn"),
    ndisRegistrationNumber: formData.get("ndisRegistrationNumber"),
    serviceCategories: formData.get("serviceCategories"),
    rating: formData.get("rating"),
    capacityStatus: formData.get("capacityStatus"),
    rateNotes: formData.get("rateNotes"),
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    notes: formData.get("notes"),
  });
}

function toData(data: z.infer<typeof providerSchema>) {
  return {
    name: data.name,
    abn: data.abn || null,
    ndisRegistrationNumber: data.ndisRegistrationNumber || null,
    serviceCategories: data.serviceCategories || null,
    rating: parseRating(data.rating),
    capacityStatus: data.capacityStatus || null,
    rateNotes: data.rateNotes || null,
    contactName: data.contactName || null,
    contactEmail: data.contactEmail || null,
    contactPhone: data.contactPhone || null,
    notes: data.notes || null,
  };
}

export async function createProviderAction(
  _prev: ProviderFormState,
  formData: FormData
): Promise<ProviderFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const provider = await db.externalProvider.create({
    data: { orgId: context.activeOrg.id, ...toData(parsed.data) },
  });

  revalidatePath("/sc/providers");
  redirect(`/sc/providers/${provider.id}`);
}

export async function deleteProviderAction(providerId: string) {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const existing = await db.externalProvider.findFirst({
    where: { id: providerId, orgId: context.activeOrg.id },
    select: {
      id: true,
      _count: { select: { engagements: true } },
    },
  });
  if (!existing) return;

  // Refuse to delete a provider with active engagements — the SC needs to
  // either end engagements first or keep the record around for audit.
  if (existing._count.engagements > 0) return;

  await db.externalProvider.delete({ where: { id: existing.id } });
  revalidatePath("/sc/providers");
  redirect("/sc/providers");
}

export async function updateProviderAction(
  providerId: string,
  _prev: ProviderFormState,
  formData: FormData
): Promise<ProviderFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const existing = await db.externalProvider.findFirst({
    where: { id: providerId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!existing) return { error: "Provider not found." };

  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  await db.externalProvider.update({
    where: { id: existing.id },
    data: toData(parsed.data),
  });

  revalidatePath("/sc/providers");
  revalidatePath(`/sc/providers/${providerId}`);
  redirect(`/sc/providers/${providerId}`);
}