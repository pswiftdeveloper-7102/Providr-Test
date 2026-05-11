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