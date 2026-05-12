"use server";

import { randomBytes, createHash } from "crypto";
import { z } from "zod";

import { db } from "@/lib/db";

const RESET_TOKEN_TTL_HOURS = 1;

const schema = z.object({
  email: z.string().trim().email("Please enter a valid email address."),
});

export type ForgotPasswordState = {
  error?: string;
  fieldErrors?: { email?: string };
  /**
   * When the request succeeded we always tell the user "if the email
   * exists, a reset link has been generated" — but for development /
   * pre-email-integration we also surface the link itself here so it
   * can be copied. Production should null this out once an email
   * transport is wired up.
   */
  ok?: boolean;
  resetUrl?: string;
};

export async function requestPasswordResetAction(
  _prev: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const parsed = schema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return {
      fieldErrors: {
        email: parsed.error.issues[0]?.message ?? "Invalid email.",
      },
    };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true },
  });

  // For accounts that don't exist we still pretend we sent the link —
  // never reveal email-membership to an unauthenticated user.
  if (!user) {
    return { ok: true };
  }

  // Generate a high-entropy token. Store only the SHA-256 hash so the
  // database breach surface is minimised.
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000
  );

  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const baseUrl =
    process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3030";
  const resetUrl = `${baseUrl}/reset-password/${token}`;

  return { ok: true, resetUrl };
}