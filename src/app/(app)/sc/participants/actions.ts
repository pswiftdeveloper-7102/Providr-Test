"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertCoordinator } from "@/lib/rbac";

const createParticipantSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  ndisNumber: z.string().trim().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  pronouns: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
});

export type CreateParticipantState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createSCParticipantAction(
  _prev: CreateParticipantState,
  formData: FormData
): Promise<CreateParticipantState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const parsed = createParticipantSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    ndisNumber: formData.get("ndisNumber"),
    dateOfBirth: formData.get("dateOfBirth"),
    pronouns: formData.get("pronouns"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    address: formData.get("address"),
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
  const participant = await db.participant.create({
    data: {
      orgId: context.activeOrg.id,
      firstName: data.firstName,
      lastName: data.lastName,
      ndisNumber: data.ndisNumber || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      pronouns: data.pronouns || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    },
  });

  revalidatePath("/sc/participants");
  redirect(`/sc/participants/${participant.id}`);
}

export async function toggleComplexNeedsAction(participantId: string) {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const participant = await db.participant.findFirst({
    where: { id: participantId, orgId: context.activeOrg.id },
    select: { id: true, complexNeeds: true },
  });
  if (!participant) return;

  await db.participant.update({
    where: { id: participant.id },
    data: { complexNeeds: !participant.complexNeeds },
  });

  revalidatePath(`/sc/participants/${participant.id}`);
  revalidatePath("/sc/participants");
}