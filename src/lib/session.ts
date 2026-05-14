import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { portalKey, type PortalKey } from "@/lib/portal";

/**
 * Server-side helpers for resolving the current user, their orgs,
 * and which portal context they're operating in.
 *
 * Every async helper here is wrapped in React.cache() so duplicate
 * calls within the same request (layout → page → header → banner all
 * call `resolvePortalContext` independently) re-use the first result
 * instead of redoing the auth + DB work. Big win for page load time.
 */

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
});

export type OrgWithEntitlements = Awaited<
  ReturnType<typeof getUserOrgs>
>[number];

export const getUserOrgs = cache(async (userId: string) => {
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
});

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
export const resolvePortalContext = cache(async (
  requested: PortalKey
): Promise<ResolvedPortalContext> => {
  const user = await requireUser();
  const orgs = await getUserOrgs(user.id);

  if (orgs.length === 0) {
    redirect("/no-org");
  }

  // For separate-org hybrid users (e.g. one Org for SC, another for
  // Provider), pick the org that actually holds the requested portal
  // entitlement. Falls back to the first org if none match — the redirect
  // below will then bounce them to a portal that exists.
  const orgWithRequestedPortal = orgs.find((o) =>
    o.entitlements.some((e) => portalKey(e.portal) === requested)
  );
  const activeOrg = orgWithRequestedPortal ?? orgs[0];
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
});

// Q8 (2026-05-12): worker context for the Worker App at /app. Workers
// are linked to a User via Worker.userId — the invite flow also creates
// an OrgMembership so resolvePortalContext("provider") works inside the
// PWA shell. This helper is used by routes that need the Worker row
// itself (shift detail, progress notes, etc.).
export type ResolvedWorkerContext = {
  user: { id: string; email: string | null; name: string | null };
  worker: {
    id: string;
    orgId: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  org: { id: string; legalName: string; tradingName: string | null };
};

export const resolveWorkerContext = cache(async (): Promise<ResolvedWorkerContext> => {
  const user = await requireUser();
  const worker = await db.worker.findFirst({
    where: { userId: user.id },
    select: {
      id: true,
      orgId: true,
      firstName: true,
      lastName: true,
      email: true,
      org: {
        select: { id: true, legalName: true, tradingName: true },
      },
    },
  });
  if (!worker) {
    redirect("/no-org");
  }
  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
    },
    worker: {
      id: worker.id,
      orgId: worker.orgId,
      firstName: worker.firstName,
      lastName: worker.lastName,
      email: worker.email,
    },
    org: worker.org,
  };
});