"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertCoordinator } from "@/lib/rbac";
import { saveUpload } from "@/lib/uploads";
import { dollarsToCents } from "@/lib/utils";

const planSchema = z.object({
  ndisPlanNumber: z.string().trim().optional().or(z.literal("")),
  startDate: z.string().min(1, "Start date is required."),
  endDate: z.string().min(1, "End date is required."),
  coreDollars: z.string(),
  capacityDollars: z.string(),
  capitalDollars: z.string(),
});

export type PlanFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return planSchema.safeParse({
    ndisPlanNumber: formData.get("ndisPlanNumber"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    coreDollars: formData.get("coreDollars") ?? "0",
    capacityDollars: formData.get("capacityDollars") ?? "0",
    capitalDollars: formData.get("capitalDollars") ?? "0",
  });
}

async function maybeUploadPlanFile(
  formData: FormData
): Promise<{ key?: string; name?: string; error?: string }> {
  const file = formData.get("planFile");
  if (!(file instanceof File) || file.size === 0) {
    return {};
  }
  try {
    const result = await saveUpload(file);
    return { key: result.key, name: result.name };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

export async function createSCPlanAction(
  participantId: string,
  _prev: PlanFormState,
  formData: FormData
): Promise<PlanFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const participant = await db.participant.findFirst({
    where: { id: participantId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!participant) return { error: "Participant not found." };

  const parsed = parseForm(formData);
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
    return { fieldErrors: { endDate: "End date must be after start date." } };
  }

  const coreCents = dollarsToCents(parsed.data.coreDollars);
  const capacityCents = dollarsToCents(parsed.data.capacityDollars);
  const capitalCents = dollarsToCents(parsed.data.capitalDollars);
  const totalCents = coreCents + capacityCents + capitalCents;
  if (totalCents <= 0) {
    return { error: "Plan total must be greater than zero." };
  }

  const upload = await maybeUploadPlanFile(formData);
  if (upload.error) return { error: upload.error };

  await db.plan.create({
    data: {
      participantId,
      ndisPlanNumber: parsed.data.ndisPlanNumber || null,
      startDate: start,
      endDate: end,
      totalCents,
      status: "ACTIVE",
      planFileKey: upload.key ?? null,
      planFileName: upload.name ?? null,
      budgets: {
        create: [
          { category: "CORE", totalCents: coreCents },
          { category: "CAPACITY", totalCents: capacityCents },
          { category: "CAPITAL", totalCents: capitalCents },
        ],
      },
    },
  });

  revalidatePath(`/sc/participants/${participantId}`);
  redirect(`/sc/participants/${participantId}`);
}

export async function updateSCPlanAction(
  planId: string,
  _prev: PlanFormState,
  formData: FormData
): Promise<PlanFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const plan = await db.plan.findFirst({
    where: {
      id: planId,
      participant: { orgId: context.activeOrg.id },
    },
    include: { budgets: true },
  });
  if (!plan) return { error: "Plan not found." };

  const parsed = parseForm(formData);
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
    return { fieldErrors: { endDate: "End date must be after start date." } };
  }

  const coreCents = dollarsToCents(parsed.data.coreDollars);
  const capacityCents = dollarsToCents(parsed.data.capacityDollars);
  const capitalCents = dollarsToCents(parsed.data.capitalDollars);
  const totalCents = coreCents + capacityCents + capitalCents;
  if (totalCents <= 0) {
    return { error: "Plan total must be greater than zero." };
  }

  // Reject reallocation that would set a bucket below what's already
  // been spent against it — that would silently corrupt the burn rate.
  const newByCategory = {
    CORE: coreCents,
    CAPACITY: capacityCents,
    CAPITAL: capitalCents,
  } as const;
  for (const b of plan.budgets) {
    const newTotal = newByCategory[b.category as keyof typeof newByCategory];
    if (newTotal < b.spentCents) {
      return {
        fieldErrors: {
          [`${b.category.toLowerCase()}Dollars`]: `Already spent ${(
            b.spentCents / 100
          ).toFixed(2)} from this bucket — can't allocate less.`,
        },
      };
    }
  }

  const upload = await maybeUploadPlanFile(formData);
  if (upload.error) return { error: upload.error };

  await db.$transaction(async (tx) => {
    await tx.plan.update({
      where: { id: plan.id },
      data: {
        ndisPlanNumber: parsed.data.ndisPlanNumber || null,
        startDate: start,
        endDate: end,
        totalCents,
        ...(upload.key
          ? { planFileKey: upload.key, planFileName: upload.name ?? null }
          : {}),
      },
    });
    for (const b of plan.budgets) {
      await tx.planBudget.update({
        where: { id: b.id },
        data: {
          totalCents: newByCategory[b.category as keyof typeof newByCategory],
        },
      });
    }
  });

  revalidatePath(`/sc/participants/${plan.participantId}`);
  revalidatePath("/sc/budgets");
  redirect(`/sc/participants/${plan.participantId}`);
}