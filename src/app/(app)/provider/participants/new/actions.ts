"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";

const createParticipantSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  ndisNumber: z.string().trim().optional().or(z.literal("")),
  pronouns: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  // Belt-and-braces on top of the `max` attribute on the input — server
  // never trusts the client.
  dateOfBirth: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(
      (s) => {
        if (!s) return true;
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return false;
        return d <= new Date();
      },
      { message: "Date of birth can't be in the future." }
    ),
});

export type CreateParticipantState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createParticipantAction(
  _prev: CreateParticipantState,
  formData: FormData
): Promise<CreateParticipantState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const parsed = createParticipantSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    ndisNumber: formData.get("ndisNumber"),
    pronouns: formData.get("pronouns"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
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
  const created = await db.participant.create({
    data: {
      orgId: context.activeOrg.id,
      firstName: data.firstName,
      lastName: data.lastName,
      ndisNumber: data.ndisNumber || null,
      pronouns: data.pronouns || null,
      email: data.email || null,
      phone: data.phone || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    },
  });

  revalidatePath("/provider/participants");
  redirect(`/provider/participants/${created.id}`);
}