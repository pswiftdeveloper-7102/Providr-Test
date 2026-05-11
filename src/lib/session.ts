import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { portalKey, type PortalKey } from "@/lib/portal";

/**
 * Server-side helpers for resolving the current user, their orgs,
 * and which portal context they're operating in.
 */

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

export type OrgWithEntitlements = Awaited<
  ReturnType<typeof getUserOrgs>
>[number];

export async function getUserOrgs(userId: string) {
  return db.org.findMany({
    where: {
      memberships: { some: { userId } },
    },
    include: {
      entitlements: { where: { active: true } },
      memberships: { where: { userId } },
    },
    orderBy: { legalName: "asc" },
  });
}

export type ResolvedPortalContext = {
  user: { id: string; email: string | null; name: string | null };
  orgs: OrgWithEntitlements[];
  activeOrg: OrgWithEntitlements;
  activePortal: PortalKey;
  availablePortals: PortalKey[];
};

/**
 * Resolves the active org + portal for the current user given a route hint.
 * For v1: pick the first org the user is a member of, and confirm it has
 * an entitlement for the requested portal. Multi-org switching comes later.
 */
export async function resolvePortalContext(
  requested: PortalKey
): Promise<ResolvedPortalContext> {
  const user = await requireUser();
  const orgs = await getUserOrgs(user.id);

  if (orgs.length === 0) {
    redirect("/no-org");
  }

  const activeOrg = orgs[0];
  const availablePortals = activeOrg.entitlements.map((e) =>
    portalKey(e.portal)
  );

  if (!availablePortals.includes(requested)) {
    // Fall back to whichever portal the org actually has.
    const fallback = availablePortals[0];
    if (fallback) redirect(`/${fallback}`);
    redirect("/no-org");
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
    },
    orgs,
    activeOrg,
    activePortal: requested,
    availablePortals,
  };
}