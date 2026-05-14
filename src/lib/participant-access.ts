import { cache } from "react";

import { db } from "@/lib/db";
import { isSupportWorkerOnly } from "@/lib/rbac";
import type { ResolvedPortalContext } from "@/lib/session";

/**
 * Returns the participants the current user can see for the active org.
 *
 * - Managers see every participant in the org.
 * - Support-worker-only users see only participants they've been granted
 *   access to via WorkerParticipant. If they have no linked Worker row
 *   or no grants, the list is empty.
 *
 * Wrapped in React.cache so multiple callers within one request (page +
 * sub-form, etc.) don't re-query.
 */
export const getAccessibleParticipants = cache(
  async (context: ResolvedPortalContext) => {
    const orgId = context.activeOrg.id;

    if (!isSupportWorkerOnly(context)) {
      return db.participant.findMany({
        where: { orgId },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: { id: true, firstName: true, lastName: true, ndisNumber: true },
      });
    }

    const worker = await db.worker.findFirst({
      where: { userId: context.user.id, orgId },
      select: { id: true },
    });
    if (!worker) return [];

    return db.participant.findMany({
      where: {
        orgId,
        workerAccess: { some: { workerId: worker.id } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true, ndisNumber: true },
    });
  }
);