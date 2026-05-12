"use server";

import { createHash, randomBytes } from "crypto";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";
import { assertManager } from "@/lib/rbac";

const INVITE_TTL_DAYS = 14;

export type InviteWorkerState = {
  error?: string;
  ok?: boolean;
  inviteUrl?: string;
};

// Q8 (2026-05-12): admin generates a one-time invite link a worker can
// use to claim a login. No email transport yet — the URL is returned for
// the admin to share manually until Q4 email channel is wired up.
export async function inviteWorkerAction(
  workerId: string,
  _prev: InviteWorkerState
): Promise<InviteWorkerState> {
  const context = await resolvePortalContext("provider");
  assertManager(context);

  const worker = await db.worker.findFirst({
    where: { id: workerId, orgId: context.activeOrg.id },
    select: { id: true, email: true, userId: true, firstName: true },
  });
  if (!worker) {
    return { error: "Worker not found." };
  }
  if (worker.userId) {
    return {
      error: `${worker.firstName} already has a login — no invite needed.`,
    };
  }
  if (!worker.email) {
    return {
      error:
        "Add an email on the worker's profile before sending an invite.",
    };
  }

  const session = await auth();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await db.$transaction(async (tx) => {
    // Invalidate any outstanding invites for this worker so the new one
    // is the only working link.
    await tx.workerInvite.updateMany({
      where: { workerId, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    await tx.workerInvite.create({
      data: {
        workerId,
        email: worker.email!,
        tokenHash,
        expiresAt,
        createdBy: session?.user?.id ?? null,
      },
    });
  });

  const baseUrl =
    process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3030";
  return { ok: true, inviteUrl: `${baseUrl}/worker-invite/${token}` };
}