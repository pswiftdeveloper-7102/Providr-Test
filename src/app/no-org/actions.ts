"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { OrgRole, Portal } from "@prisma/client";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";

// Onboarding for users who signed in (typically via Google) and don't
// yet belong to an organisation. Mirrors the org-creation half of the
// regular signup form — including the hybrid Provider+SC choice and
// CoI form for same-org hybrids.

const PortalEnum = z.enum(["PROVIDER", "SC"]);
const HybridOrgTypeEnum = z.enum(["SAME", "SEPARATE"]);

const schema = z.object({
  signUpAs: PortalEnum,
  companyLegalName: z.string().trim().min(1, "Company legal name is required."),
  companyTradingName: z.string().trim().optional().or(z.literal("")),
  abn: z.string().trim().optional().or(z.literal("")),
  alsoOperatesOther: z.string().optional(),
  hybridOrgType: HybridOrgTypeEnum.optional(),
  otherCompanyLegalName: z.string().trim().optional().or(z.literal("")),
  otherCompanyTradingName: z.string().trim().optional().or(z.literal("")),
  otherAbn: z.string().trim().optional().or(z.literal("")),
});

export type OnboardingState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function otherPortal(p: Portal): Portal {
  return p === "PROVIDER" ? "SC" : "PROVIDER";
}

function primaryRole(portal: Portal): OrgRole {
  return portal === "SC" ? "SUPPORT_COORDINATOR" : "OWNER";
}

export async function createOrganisationAction(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Refuse to create another org if the user is already linked to one.
  const existingMembership = await db.orgMembership.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (existingMembership) redirect("/provider");

  const parsed = schema.safeParse({
    signUpAs: formData.get("signUpAs"),
    companyLegalName: formData.get("companyLegalName") ?? undefined,
    companyTradingName: formData.get("companyTradingName") ?? undefined,
    abn: formData.get("abn") ?? undefined,
    alsoOperatesOther: formData.get("alsoOperatesOther") || undefined,
    hybridOrgType: formData.get("hybridOrgType") || undefined,
    otherCompanyLegalName: formData.get("otherCompanyLegalName") ?? undefined,
    otherCompanyTradingName:
      formData.get("otherCompanyTradingName") ?? undefined,
    otherAbn: formData.get("otherAbn") ?? undefined,
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
  const isHybrid = data.alsoOperatesOther === "yes";
  if (isHybrid) {
    if (!data.hybridOrgType) {
      return {
        fieldErrors: {
          hybridOrgType:
            "Same company or separate?",
        },
      };
    }
    if (data.hybridOrgType === "SEPARATE" && !data.otherCompanyLegalName) {
      return {
        fieldErrors: {
          otherCompanyLegalName:
            "Legal name of the other company is required.",
        },
      };
    }
  }

  // ABN uniqueness checks across this org and (if any) the second org.
  if (data.abn) {
    const clash = await db.org.findFirst({
      where: { abn: data.abn },
      select: { id: true },
    });
    if (clash) {
      return {
        fieldErrors: { abn: "An organisation with this ABN already exists." },
      };
    }
  }
  if (isHybrid && data.hybridOrgType === "SEPARATE" && data.otherAbn) {
    if (data.otherAbn === data.abn) {
      return {
        fieldErrors: {
          otherAbn:
            "The two companies need different ABNs.",
        },
      };
    }
    const clash = await db.org.findFirst({
      where: { abn: data.otherAbn },
      select: { id: true },
    });
    if (clash) {
      return {
        fieldErrors: {
          otherAbn: "An organisation with this ABN already exists.",
        },
      };
    }
  }

  const primary = data.signUpAs;
  const secondary = otherPortal(primary);
  const userId = session.user.id;

  await db.$transaction(async (tx) => {
    if (isHybrid && data.hybridOrgType === "SAME") {
      const org = await tx.org.create({
        data: {
          legalName: data.companyLegalName,
          tradingName: data.companyTradingName || null,
          abn: data.abn || null,
          entitlements: {
            create: [{ portal: primary }, { portal: secondary }],
          },
          conflictOfInterestForm: { create: {} },
        },
      });
      const roles = Array.from(
        new Set<OrgRole>([primaryRole(primary), primaryRole(secondary)])
      );
      await tx.orgMembership.create({
        data: { userId, orgId: org.id, roles },
      });
    } else if (isHybrid && data.hybridOrgType === "SEPARATE") {
      const org1 = await tx.org.create({
        data: {
          legalName: data.companyLegalName,
          tradingName: data.companyTradingName || null,
          abn: data.abn || null,
          entitlements: { create: [{ portal: primary }] },
        },
      });
      const org2 = await tx.org.create({
        data: {
          legalName: data.otherCompanyLegalName!,
          tradingName: data.otherCompanyTradingName || null,
          abn: data.otherAbn || null,
          entitlements: { create: [{ portal: secondary }] },
        },
      });
      await tx.orgMembership.createMany({
        data: [
          { userId, orgId: org1.id, roles: [primaryRole(primary)] },
          { userId, orgId: org2.id, roles: [primaryRole(secondary)] },
        ],
      });
    } else {
      const org = await tx.org.create({
        data: {
          legalName: data.companyLegalName,
          tradingName: data.companyTradingName || null,
          abn: data.abn || null,
          entitlements: { create: [{ portal: primary }] },
        },
      });
      await tx.orgMembership.create({
        data: { userId, orgId: org.id, roles: [primaryRole(primary)] },
      });
    }
  });

  revalidatePath("/provider");
  revalidatePath("/sc");
  redirect(primary === "SC" ? "/sc" : "/provider");
}