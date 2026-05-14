"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import { db } from "@/lib/db";

// PWA login mirrors the web /login action, but lives in its own file so
// it can evolve independently (e.g. longer session, magic-link, etc.)
// without risking the web flow.
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type AppLoginState = {
  error?: string;
  fieldErrors?: { email?: string; password?: string };
};

export async function appLoginAction(
  _prev: AppLoginState,
  formData: FormData
): Promise<AppLoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const fieldErrors: AppLoginState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === "email" || key === "password") {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      if (err.type === "CredentialsSignin") {
        return { error: "Email or password is incorrect." };
      }
      return { error: "Sign-in failed. Please try again." };
    }
    throw err;
  }

  // The PWA is the Worker App — drop everyone here after sign-in. Root
  // page dispatches non-worker org members to /provider or /sc.
  redirect("/app");
}

export async function appGoogleSignInAction() {
  await signIn("google", { redirectTo: "/app" });
}

// PWA sign out: must land at /app/login, NOT /login. Using the shared
// signOutAction sends the user to the web portal's login page, and
// signing in there bounces them to /provider — outside the PWA.
export async function appSignOutAction() {
  await signOut({ redirectTo: "/app/login" });
}

// PWA signup: lightweight version of the web /signup. Creates just the
// User row; if the new user needs an org, /no-org's onboarding form
// handles the rest on desktop or here as a follow-up.
const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.string().trim().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type AppSignupState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function appSignupAction(
  _prev: AppSignupState,
  formData: FormData
): Promise<AppSignupState> {
  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
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
  const email = data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return {
      fieldErrors: {
        email:
          "An account with this email already exists — sign in instead.",
      },
    };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.user.create({
    data: {
      email,
      firstName: data.firstName,
      lastName: data.lastName,
      name: `${data.firstName} ${data.lastName}`,
      passwordHash,
    },
  });

  // Sign the new user in immediately. The root page will route them to
  // /no-org since they have no org membership yet.
  try {
    await signIn("credentials", {
      email,
      password: data.password,
      redirect: false,
    });
  } catch {
    return {
      error:
        "Account created — but we couldn't sign you in automatically. Try signing in.",
    };
  }

  redirect("/app");
}