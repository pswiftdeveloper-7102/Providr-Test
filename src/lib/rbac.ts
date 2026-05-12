// Role-based access control helpers.
//
// The diagram (Provider Scene A) shows six provider roles. For v1 we make
// one meaningful cleavage: **support-worker-only users** see a narrow,
// task-focused view (their own shifts, file an incident); **manager
// roles** (Owner, Rostering, Care, Compliance, Office Admin) can see and
// manage the whole org. Finer-grained role gates (e.g. only Compliance
// touches restraint logs) can layer on later — they don't add value yet
// because most of those features aren't built.

import { forbidden, redirect } from "next/navigation";

import type { OrgRole } from "@prisma/client";
import type { ResolvedPortalContext } from "@/lib/session";

export const MANAGER_ROLES: OrgRole[] = [
  "OWNER",
  "ROSTERING_MANAGER",
  "CARE_MANAGER",
  "COMPLIANCE_MANAGER",
  "OFFICE_ADMIN",
];

export function getActiveRoles(
  context: ResolvedPortalContext
): OrgRole[] {
  // The user's memberships are included on the active org via the session
  // resolver; pull the role list from the matching membership.
  const membership = context.activeOrg.memberships.find(
    (m) => m.userId === context.user.id
  );
  return membership?.roles ?? [];
}

export function hasAnyRole(
  roles: OrgRole[],
  allowed: OrgRole[]
): boolean {
  return roles.some((r) => allowed.includes(r));
}

export function isManager(context: ResolvedPortalContext): boolean {
  return hasAnyRole(getActiveRoles(context), MANAGER_ROLES);
}

export function isSupportWorkerOnly(
  context: ResolvedPortalContext
): boolean {
  const roles = getActiveRoles(context);
  if (roles.length === 0) return false;
  return roles.every((r) => r === "SUPPORT_WORKER");
}

// Friendly labels per Provider Scene A.
export const ROLE_LABEL: Record<OrgRole, string> = {
  OWNER: "Owner",
  ROSTERING_MANAGER: "Rostering manager",
  CARE_MANAGER: "Care manager",
  COMPLIANCE_MANAGER: "Compliance manager",
  OFFICE_ADMIN: "Office admin",
  SUPPORT_WORKER: "Support worker",
  SUPPORT_COORDINATOR: "Support coordinator",
};

// SC portal roles — Owner counts as a coordinator in same-org hybrids
// where the boss does both jobs, and in pure-SC orgs the owner is by
// definition a coordinator. Pure SUPPORT_COORDINATOR users qualify too.
export const COORDINATOR_ROLES: OrgRole[] = ["OWNER", "SUPPORT_COORDINATOR"];

export function isCoordinator(context: ResolvedPortalContext): boolean {
  return hasAnyRole(getActiveRoles(context), COORDINATOR_ROLES);
}

export function assertCoordinator(context: ResolvedPortalContext) {
  if (!isCoordinator(context)) forbidden();
}

/**
 * Redirect support-worker-only users away from manager-only routes.
 * Use at the top of any page that should only be accessible to managers.
 */
export function requireManager(context: ResolvedPortalContext) {
  if (!isManager(context)) {
    // Support workers landing on a manager-only route go to their own
    // home where they'll see their shifts.
    redirect("/provider");
  }
}

/**
 * Hard 403 for cases where a redirect would be confusing — used by
 * server actions that shouldn't quietly succeed for the wrong role.
 */
export function assertManager(context: ResolvedPortalContext) {
  if (!isManager(context)) forbidden();
}