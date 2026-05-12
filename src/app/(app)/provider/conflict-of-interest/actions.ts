"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

const signSchema = z.object({
  acknowledged: z.string().min(1, "Please confirm you've read the policy."),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type SignCoIState = {
  error?: string;
  fieldErrors?: { acknowledged?: string };
  ok?: boolean;
};

export async function signCoIAction(
  _prev: SignCoIState,
  formData: FormData
): Promise<SignCoIState> {
  const context = await resolvePortalContext("provider");

  const parsed = signSchema.safeParse({
    acknowledged: formData.get("acknowledged") ?? "",
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    const fieldErrors: SignCoIState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof typeof fieldErrors;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const session = await auth();
  await db.conflictOfInterestForm.upsert({
    where: { orgId: context.activeOrg.id },
    create: {
      orgId: context.activeOrg.id,
      signedAt: new Date(),
      signedByUserId: session?.user?.id ?? null,
      notes: parsed.data.notes || null,
    },
    update: {
      signedAt: new Date(),
      signedByUserId: session?.user?.id ?? null,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/provider");
  revalidatePath("/sc");
  revalidatePath("/conflict-of-interest");
  return { ok: true };
}