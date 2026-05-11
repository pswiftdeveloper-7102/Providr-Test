"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { COUNTRY_CODES, findCountry } from "@/lib/country-codes";

const PortalEnum = z.enum(["PROVIDER", "SC"]);

const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.string().trim().email("Please enter a valid email address."),
    phoneCountryIso: z
      .string()
      .min(1, "Country is required.")
      .refine((iso) => COUNTRY_CODES.some((c) => c.iso === iso), {
        message: "Unknown country.",
      }),
    phoneNumber: z
      .string()
      .trim()
      .min(1, "Phone number is required.")
      .regex(/^[0-9 ]+$/, "Phone number can only contain digits."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
    signUpAs: PortalEnum.optional(),
    companyLegalName: z.string().trim().optional(),
    companyTradingName: z.string().trim().optional().or(z.literal("")),
    abn: z.string().trim().optional().or(z.literal("")),
    isNdisRegistered: z.string().optional(),
    acceptedTerms: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignupState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  failedStep?: 1 | 2;
};

const STEP_1_FIELDS = new Set([
  "firstName",
  "lastName",
  "email",
  "phoneCountryIso",
  "phoneNumber",
  "password",
  "confirmPassword",
]);

export async function signupAction(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phoneCountryIso: formData.get("phoneCountryIso"),
    phoneNumber: formData.get("phoneNumber"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    signUpAs: formData.get("signUpAs") || undefined,
    companyLegalName: formData.get("companyLegalName"),
    companyTradingName: formData.get("companyTradingName"),
    abn: formData.get("abn") ?? undefined,
    isNdisRegistered: formData.get("isNdisRegistered") ?? undefined,
    acceptedTerms: formData.get("acceptedTerms") ?? undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    const failedStep: 1 | 2 = Object.keys(fieldErrors).some((k) =>
      STEP_1_FIELDS.has(k)
    )
      ? 1
      : 2;
    return { fieldErrors, failedStep };
  }

  const data = parsed.data;

  // Step 2 is required to finish registration.
  if (!data.signUpAs) {
    return {
      fieldErrors: { signUpAs: "Please choose Provider or Support Coordinator." },
      failedStep: 2,
    };
  }
  if (!data.companyLegalName) {
    return {
      fieldErrors: {
        companyLegalName: "Company legal name is required.",
      },
      failedStep: 2,
    };
  }

  // Terms of service must be explicitly accepted.
  if (data.acceptedTerms !== "on" && data.acceptedTerms !== "true") {
    return {
      fieldErrors: {
        acceptedTerms: "Please accept the terms and conditions to continue.",
      },
      failedStep: 2,
    };
  }


  const existing = await db.user.findUnique({
    where: { email: data.email.toLowerCase() },
    select: { id: true },
  });
  if (existing) {
    return {
      fieldErrors: { email: "An account with this email already exists." },
      failedStep: 1,
    };
  }

  if (data.abn) {
    const abnClash = await db.org.findFirst({
      where: { abn: data.abn },
      select: { id: true },
    });
    if (abnClash) {
      return {
        fieldErrors: { abn: "An organisation with this ABN already exists." },
        failedStep: 2,
      };
    }
  }

  const country = findCountry(data.phoneCountryIso);
  const e164 = country
    ? `+${country.dialCode}${data.phoneNumber.replace(/\s+/g, "")}`
    : data.phoneNumber;

  const passwordHash = await bcrypt.hash(data.password, 10);
  const ownerRole = data.signUpAs === "SC" ? "SUPPORT_COORDINATOR" : "OWNER";

  await db.$transaction(async (tx) => {
    const org = await tx.org.create({
      data: {
        legalName: data.companyLegalName!,
        tradingName: data.companyTradingName || null,
        abn: data.abn || null,
        entitlements: { create: [{ portal: data.signUpAs! }] },
      },
    });
    await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        phone: e164,
        passwordHash,
        memberships: {
          create: {
            orgId: org.id,
            roles: ownerRole === "OWNER" ? ["OWNER"] : ["SUPPORT_COORDINATOR"],
          },
        },
      },
    });
  });

  const redirectTo = data.signUpAs === "SC" ? "/sc" : "/provider";

  try {
    await signIn("credentials", {
      email: data.email.toLowerCase(),
      password: data.password,
      redirectTo,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        error: "Account created but sign-in failed. Please sign in manually.",
      };
    }
    throw err;
  }

  return {};
}

export async function googleSignUpAction() {
  // Google sign-up reuses the same OAuth flow as sign-in. Users without an
  // org membership are redirected to /no-org by resolvePortalContext until
  // they complete onboarding.
  await signIn("google", { redirectTo: "/provider" });
}