"use server";

import { createHash } from "crypto";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type AcceptWorkerInviteState = {
  error?: string;
  fieldErrors?: { password?: string; confirmPassword?: string };
  ok?: boolean;
  workerEmail?: string;
};

// Q8 (2026-05-12): worker claims their login via a one-time invite. If a
// User already exists for the invite's email (e.g. they previously
// signed up via Google), we link it; otherwise we create a fresh User
// with the supplied password. Worker.userId gets set either way.
export async function acceptWorkerInviteAction(
  token: string,
  _prev: AcceptWorkerInviteState,
  formData: FormData
): Promise<AcceptWorkerInviteState> {
  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const fieldErrors: AcceptWorkerInviteState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof typeof fieldErrors;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = await db.workerInvite.findUnique({
    where: { tokenHash },
    include: {
      worker: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return {
      error: "This invite is invalid or has expired. Ask your coordinator for a new one.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const email = invite.email.toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email } });

  await db.$transaction(async (tx) => {
    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
      // If the existing user has no password (Google-only sign-up), set
      // one; otherwise leave their existing password alone.
      if (!existingUser.passwordHash) {
        await tx.user.update({
          where: { id: userId },
          data: { passwordHash },
        });
      }
    } else {
      const created = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName: invite.worker.firstName,
          lastName: invite.worker.lastName,
          name: `${invite.worker.firstName} ${invite.worker.lastName}`,
        },
      });
      userId = created.id;
    }

    await tx.worker.update({
      where: { id: invite.workerId },
      data: { userId },
    });
    await tx.workerInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  });

  return { ok: true, workerEmail: email };
}

export async function checkInviteAction(
  token: string
): Promise<
  | { ok: true; email: string; workerName: string }
  | { ok: false; error: string }
> {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invite = await db.workerInvite.findUnique({
    where: { tokenHash },
    include: {
      worker: { select: { firstName: true, lastName: true } },
    },
  });
  if (!invite) {
    return { ok: false, error: "This invite link isn't valid." };
  }
  if (invite.acceptedAt) {
    return {
      ok: false,
      error: "This invite has already been used. Sign in with your password instead.",
    };
  }
  if (invite.expiresAt < new Date()) {
    return {
      ok: false,
      error: "This invite has expired. Ask your coordinator for a new one.",
    };
  }
  return {
    ok: true,
    email: invite.email,
    workerName: `${invite.worker.firstName} ${invite.worker.lastName}`,
  };
}