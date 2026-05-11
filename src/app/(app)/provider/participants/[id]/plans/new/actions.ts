"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";
import { dollarsToCents } from "@/lib/utils";

const planSchema = z.object({
  ndisPlanNumber: z.string().trim().optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  coreDollars: z.string(),
  capacityDollars: z.string(),
  capitalDollars: z.string(),
});

export type CreatePlanState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function createPlanAction(
  participantId: string,
  _prev: CreatePlanState,
  formData: FormData
): Promise<CreatePlanState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  // Confirm the participant belongs to the active org before mutating.
  const participant = await db.participant.findFirst({
    where: { id: participantId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!participant) {
    return { error: "Participant not found." };
  }

  const parsed = planSchema.safeParse({
    ndisPlanNumber: formData.get("ndisPlanNumber"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    coreDollars: formData.get("coreDollars") ?? "0",
    capacityDollars: formData.get("capacityDollars") ?? "0",
    capitalDollars: formData.get("capitalDollars") ?? "0",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const start = new Date(parsed.data.startDate);
  const end = new Date(parsed.data.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { error: "Invalid dates." };
  }
  if (end <= start) {
    return {
      fieldErrors: { endDate: "End date must be after the start date." },
    };
  }

  const coreCents = dollarsToCents(parsed.data.coreDollars);
  const capacityCents = dollarsToCents(parsed.data.capacityDollars);
  const capitalCents = dollarsToCents(parsed.data.capitalDollars);
  const totalCents = coreCents + capacityCents + capitalCents;

  if (totalCents <= 0) {
    return { error: "Plan total must be greater than zero." };
  }

  await db.plan.create({
    data: {
      participantId,
      ndisPlanNumber: parsed.data.ndisPlanNumber || null,
      startDate: start,
      endDate: end,
      totalCents,
      status: "ACTIVE",
      budgets: {
        create: [
          { category: "CORE", totalCents: coreCents },
          { category: "CAPACITY", totalCents: capacityCents },
          { category: "CAPITAL", totalCents: capitalCents },
        ],
      },
    },
  });

  revalidatePath(`/provider/participants/${participantId}`);
  redirect(`/provider/participants/${participantId}`);
}