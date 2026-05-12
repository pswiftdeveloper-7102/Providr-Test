import { redirect } from "next/navigation";

import { isCoordinator } from "@/lib/rbac";
import type { ResolvedPortalContext } from "@/lib/session";

/**
 * Redirect non-coordinator users away from a page. Use in page-level
 * server components where forbidden() would be too harsh.
 */
export function requireCoordinatorOrRedirect(
  context: ResolvedPortalContext,
  to: string
) {
  if (!isCoordinator(context)) redirect(to);
}