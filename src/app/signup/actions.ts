"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import type { OrgRole, Portal } from "@prisma/client";
import { z } from "zod";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { COUNTRY_CODES, findCountry } from "@/lib/country-codes";

const PortalEnum = z.enum(["PROVIDER", "SC"]);
const HybridOrgTypeEnum = z.enum(["SAME", "SEPARATE"]);

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
    // Hybrid fields — does the user also operate the other portal?
    alsoOperatesOther: z.string().optional(), // "yes" | "no" | undefined
    hybridOrgType: HybridOrgTypeEnum.optional(),
    otherCompanyLegalName: z.string().trim().optional().or(z.literal("")),
    otherCompanyTradingName: z.string().trim().optional().or(z.literal("")),
    otherAbn: z.string().trim().optional().or(z.literal("")),
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

function otherPortal(p: Portal): Portal {
  return p === "PROVIDER" ? "SC" : "PROVIDER";
}

// The "primary" role for the org's owner — Provider owners get OWNER,
// SC owners get SUPPORT_COORDINATOR (the SC role IS the business in a
// pure-SC org). Hybrid users hold both.
function primaryRole(portal: Portal): OrgRole {
  return portal === "SC" ? "SUPPORT_COORDINATOR" : "OWNER";
}

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
    alsoOperatesOther: formData.get("alsoOperatesOther") ?? undefined,
    hybridOrgType: formData.get("hybridOrgType") || undefined,
    otherCompanyLegalName: formData.get("otherCompanyLegalName"),
    otherCompanyTradingName: formData.get("otherCompanyTradingName"),
    otherAbn: formData.get("otherAbn") ?? undefined,
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

  const isHybrid = data.alsoOperatesOther === "yes";
  if (isHybrid) {
    if (!data.hybridOrgType) {
      return {
        fieldErrors: {
          hybridOrgType:
            "Please tell us whether the other portal is under the same company or a separate one.",
        },
        failedStep: 2,
      };
    }
    if (data.hybridOrgType === "SEPARATE" && !data.otherCompanyLegalName) {
      return {
        fieldErrors: {
          otherCompanyLegalName:
            "Legal name of the other company is required.",
        },
        failedStep: 2,
      };
    }
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

  // ABN uniqueness — checks both the primary and (if separate-org hybrid)
  // the second org's ABN.
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
  if (isHybrid && data.hybridOrgType === "SEPARATE" && data.otherAbn) {
    if (data.otherAbn === data.abn) {
      return {
        fieldErrors: {
          otherAbn:
            "The two companies need different ABNs. If they're the same company, choose 'same organisation' instead.",
        },
        failedStep: 2,
      };
    }
    const otherAbnClash = await db.org.findFirst({
      where: { abn: data.otherAbn },
      select: { id: true },
    });
    if (otherAbnClash) {
      return {
        fieldErrors: {
          otherAbn: "An organisation with this ABN already exists.",
        },
        failedStep: 2,
      };
    }
  }

  const country = findCountry(data.phoneCountryIso);
  const e164 = country
    ? `+${country.dialCode}${data.phoneNumber.replace(/\s+/g, "")}`
    : data.phoneNumber;

  const passwordHash = await bcrypt.hash(data.password, 10);
  const primaryPortal = data.signUpAs;
  const secondaryPortal = otherPortal(primaryPortal);

  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email.toLowerCase(),
        name: `${data.firstName} ${data.lastName}`.trim(),
        firstName: data.firstName,
        lastName: data.lastName,
        phone: e164,
        passwordHash,
      },
    });

    if (isHybrid && data.hybridOrgType === "SAME") {
      // Same-org hybrid: one Org with both entitlements + an unsigned
      // ConflictOfInterestForm. The user holds both primary roles.
      const org = await tx.org.create({
        data: {
          legalName: data.companyLegalName!,
          tradingName: data.companyTradingName || null,
          abn: data.abn || null,
          entitlements: {
            create: [{ portal: primaryPortal }, { portal: secondaryPortal }],
          },
          conflictOfInterestForm: { create: {} },
        },
      });
      const roles = Array.from(
        new Set<OrgRole>([
          primaryRole(primaryPortal),
          primaryRole(secondaryPortal),
        ])
      );
      await tx.orgMembership.create({
        data: { userId: user.id, orgId: org.id, roles },
      });
    } else if (isHybrid && data.hybridOrgType === "SEPARATE") {
      // Separate-org hybrid: two distinct Orgs, one entitlement each.
      // User is a member of both.
      const org1 = await tx.org.create({
        data: {
          legalName: data.companyLegalName!,
          tradingName: data.companyTradingName || null,
          abn: data.abn || null,
          entitlements: { create: [{ portal: primaryPortal }] },
        },
      });
      const org2 = await tx.org.create({
        data: {
          legalName: data.otherCompanyLegalName!,
          tradingName: data.otherCompanyTradingName || null,
          abn: data.otherAbn || null,
          entitlements: { create: [{ portal: secondaryPortal }] },
        },
      });
      await tx.orgMembership.createMany({
        data: [
          {
            userId: user.id,
            orgId: org1.id,
            roles: [primaryRole(primaryPortal)],
          },
          {
            userId: user.id,
            orgId: org2.id,
            roles: [primaryRole(secondaryPortal)],
          },
        ],
      });
    } else {
      // Single-portal signup — the existing v1 path.
      const org = await tx.org.create({
        data: {
          legalName: data.companyLegalName!,
          tradingName: data.companyTradingName || null,
          abn: data.abn || null,
          entitlements: { create: [{ portal: primaryPortal }] },
        },
      });
      await tx.orgMembership.create({
        data: {
          userId: user.id,
          orgId: org.id,
          roles: [primaryRole(primaryPortal)],
        },
      });
    }
  });

  const redirectTo = primaryPortal === "SC" ? "/sc" : "/provider";

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