"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";

const schema = z.object({
  name: z.string().trim().min(2, "Name is required."),
  role: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^\+\d{8,15}$/.test(v),
      "Phone must be E.164 (e.g. +61412345678)."
    ),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type SaveComplianceContactState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

export async function saveComplianceContactAction(
  _prev: SaveComplianceContactState,
  formData: FormData
): Promise<SaveComplianceContactState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    role: formData.get("role") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  if (!data.email && !data.phone) {
    return {
      error:
        "Add at least one of email or phone — there's nowhere to send alerts otherwise.",
    };
  }

  await db.orgComplianceContact.upsert({
    where: { orgId: context.activeOrg.id },
    create: {
      orgId: context.activeOrg.id,
      name: data.name,
      role: data.role || null,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
    },
    update: {
      name: data.name,
      role: data.role || null,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
    },
  });

  revalidatePath("/provider/compliance-contact");
  return { ok: true };
}