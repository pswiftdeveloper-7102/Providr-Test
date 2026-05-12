"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertCoordinator } from "@/lib/rbac";

const spendSchema = z.object({
  planBudgetId: z.string().min(1, "Pick a bucket."),
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((s) => !Number.isNaN(Number.parseFloat(s)), "Invalid amount.")
    .refine((s) => Number.parseFloat(s) > 0, "Amount must be greater than 0."),
  occurredAt: z.string().min(1, "Date is required."),
  description: z
    .string()
    .trim()
    .min(2, "What was the spend for? (2+ characters)"),
  providerName: z.string().trim().optional().or(z.literal("")),
});

export type SpendFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function logSpendAction(
  participantId: string,
  _prev: SpendFormState,
  formData: FormData
): Promise<SpendFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const participant = await db.participant.findFirst({
    where: { id: participantId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!participant) return { error: "Participant not found." };

  const parsed = spendSchema.safeParse({
    planBudgetId: formData.get("planBudgetId"),
    amount: formData.get("amount"),
    occurredAt: formData.get("occurredAt"),
    description: formData.get("description"),
    providerName: formData.get("providerName"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  // Confirm the bucket belongs to this participant's plan in this org.
  const bucket = await db.planBudget.findFirst({
    where: {
      id: parsed.data.planBudgetId,
      plan: { participantId: participant.id },
    },
    select: { id: true, planId: true },
  });
  if (!bucket) return { error: "Budget bucket not found." };

  const amountCents = Math.round(Number.parseFloat(parsed.data.amount) * 100);

  // Create entry + update the running total transactionally.
  const session = await auth();
  await db.$transaction(async (tx) => {
    await tx.spendEntry.create({
      data: {
        orgId: context.activeOrg.id,
        planBudgetId: bucket.id,
        occurredAt: new Date(parsed.data.occurredAt),
        amountCents,
        description: parsed.data.description,
        providerName: parsed.data.providerName || null,
        createdById: session?.user?.id ?? null,
      },
    });
    await tx.planBudget.update({
      where: { id: bucket.id },
      data: { spentCents: { increment: amountCents } },
    });
  });

  revalidatePath(`/sc/participants/${participantId}`);
  revalidatePath("/sc/budgets");
  redirect(`/sc/participants/${participantId}`);
}

const updateSpendSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required.")
    .refine((s) => !Number.isNaN(Number.parseFloat(s)), "Invalid amount.")
    .refine((s) => Number.parseFloat(s) > 0, "Amount must be greater than 0."),
  occurredAt: z.string().min(1, "Date is required."),
  description: z.string().trim().min(2, "What was the spend for?"),
  providerName: z.string().trim().optional().or(z.literal("")),
});

export async function updateSpendAction(
  spendId: string,
  _prev: SpendFormState,
  formData: FormData
): Promise<SpendFormState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const existing = await db.spendEntry.findFirst({
    where: { id: spendId, orgId: context.activeOrg.id },
    include: {
      planBudget: {
        select: {
          id: true,
          plan: { select: { participantId: true } },
        },
      },
    },
  });
  if (!existing) return { error: "Spend entry not found." };

  const parsed = updateSpendSchema.safeParse({
    amount: formData.get("amount"),
    occurredAt: formData.get("occurredAt"),
    description: formData.get("description"),
    providerName: formData.get("providerName"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const newAmountCents = Math.round(
    Number.parseFloat(parsed.data.amount) * 100
  );
  const delta = newAmountCents - existing.amountCents;

  await db.$transaction(async (tx) => {
    await tx.spendEntry.update({
      where: { id: existing.id },
      data: {
        amountCents: newAmountCents,
        occurredAt: new Date(parsed.data.occurredAt),
        description: parsed.data.description,
        providerName: parsed.data.providerName || null,
      },
    });
    if (delta !== 0) {
      await tx.planBudget.update({
        where: { id: existing.planBudgetId },
        data: { spentCents: { increment: delta } },
      });
    }
  });

  const participantId = existing.planBudget.plan.participantId;
  revalidatePath(`/sc/participants/${participantId}`);
  revalidatePath("/sc/budgets");
  redirect(`/sc/participants/${participantId}`);
}

export async function deleteSpendAction(spendId: string) {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const existing = await db.spendEntry.findFirst({
    where: { id: spendId, orgId: context.activeOrg.id },
    include: {
      planBudget: {
        select: {
          id: true,
          plan: { select: { participantId: true } },
        },
      },
    },
  });
  if (!existing) return;

  await db.$transaction(async (tx) => {
    await tx.spendEntry.delete({ where: { id: existing.id } });
    await tx.planBudget.update({
      where: { id: existing.planBudgetId },
      data: { spentCents: { decrement: existing.amountCents } },
    });
  });

  const participantId = existing.planBudget.plan.participantId;
  revalidatePath(`/sc/participants/${participantId}`);
  revalidatePath("/sc/budgets");
}