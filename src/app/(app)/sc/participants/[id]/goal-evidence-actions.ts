"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertCoordinator } from "@/lib/rbac";

const schema = z.object({
  evidenceSummary: z.string().trim().optional().or(z.literal("")),
});

export type GoalEvidenceState = {
  error?: string;
  ok?: boolean;
};

export async function updateGoalEvidenceAction(
  goalId: string,
  _prev: GoalEvidenceState,
  formData: FormData
): Promise<GoalEvidenceState> {
  const context = await resolvePortalContext("sc");
  assertCoordinator(context);

  const goal = await db.goal.findFirst({
    where: {
      id: goalId,
      carePlan: { orgId: context.activeOrg.id },
    },
    select: {
      id: true,
      carePlan: { select: { participantId: true } },
    },
  });
  if (!goal) return { error: "Goal not found." };

  const parsed = schema.safeParse({
    evidenceSummary: formData.get("evidenceSummary"),
  });
  if (!parsed.success) return { error: "Invalid input." };

  await db.goal.update({
    where: { id: goal.id },
    data: { evidenceSummary: parsed.data.evidenceSummary || null },
  });

  revalidatePath(`/sc/participants/${goal.carePlan.participantId}`);
  revalidatePath(
    `/sc/participants/${goal.carePlan.participantId}/evidence`
  );
  return { ok: true };
}