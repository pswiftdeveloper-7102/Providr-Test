"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";

const INVITE_TTL_DAYS = 14;

const inviteSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  email: z.string().trim().email("Enter a valid email."),
  participantId: z.string().optional().or(z.literal("")),
});

export type InviteWorkerState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
  inviteUrl?: string;
  workerFirstName?: string;
};

// Creates (or reuses) a Worker row + a one-time WorkerInvite + returns
// the invite URL the admin shares with the worker. Mirrors the per-
// worker invite on /provider/workers/[id], but as a single step
// starting from name+email rather than a pre-existing Worker.
export async function inviteWorkerFromSettingsAction(
  _prev: InviteWorkerState,
  formData: FormData
): Promise<InviteWorkerState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const parsed = inviteSchema.safeParse({
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    email: formData.get("email") ?? "",
    participantId: formData.get("participantId") ?? "",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();
  const participantId = parsed.data.participantId || null;

  // If a participant was selected, verify it belongs to the active
  // org. Server-trust: never just take the ID from the form.
  if (participantId) {
    const p = await db.participant.findFirst({
      where: { id: participantId, orgId: context.activeOrg.id },
      select: { id: true },
    });
    if (!p) {
      return {
        fieldErrors: { participantId: "Participant not found." },
      };
    }
  }

  let worker = await db.worker.findFirst({
    where: { orgId: context.activeOrg.id, email },
    select: { id: true, userId: true, firstName: true },
  });
  if (worker?.userId) {
    return {
      error: `${worker.firstName} already has a login — no invite needed.`,
    };
  }
  if (!worker) {
    const created = await db.worker.create({
      data: {
        orgId: context.activeOrg.id,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email,
      },
      select: { id: true, firstName: true, userId: true },
    });
    worker = created;
  }

  const session = await auth();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await db.$transaction(async (tx) => {
    await tx.workerInvite.updateMany({
      where: { workerId: worker!.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    await tx.workerInvite.create({
      data: {
        workerId: worker!.id,
        email,
        tokenHash,
        expiresAt,
        createdBy: session?.user?.id ?? null,
      },
    });
    if (participantId) {
      // Idempotent — composite unique on (workerId, participantId).
      // upsert keeps the access grant intact when re-inviting.
      await tx.workerParticipant.upsert({
        where: {
          workerId_participantId: {
            workerId: worker!.id,
            participantId,
          },
        },
        update: {},
        create: {
          workerId: worker!.id,
          participantId,
          createdById: session?.user?.id ?? null,
        },
      });
    }
  });

  const baseUrl =
    process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3030";
  const inviteUrl = `${baseUrl}/app/worker-invite/${token}`;

  revalidatePath("/provider/settings");
  return {
    ok: true,
    inviteUrl,
    workerFirstName: worker.firstName,
  };
}

export async function revokePendingInviteAction(workerId: string) {
  const context = await resolvePortalContext("provider");
  assertManager(context);
  const worker = await db.worker.findFirst({
    where: { id: workerId, orgId: context.activeOrg.id },
    select: { id: true },
  });
  if (!worker) return { error: "Worker not found." };
  await db.workerInvite.updateMany({
    where: { workerId: worker.id, acceptedAt: null },
    data: { acceptedAt: new Date() },
  });
  revalidatePath("/provider/settings");
  return { ok: true };
}