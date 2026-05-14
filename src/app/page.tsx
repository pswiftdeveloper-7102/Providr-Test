import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Dispatch by role priority:
  // 1. Linked Worker (Worker.userId === session user) → /app (PWA is
  //    the Worker App per the 2026-05-14 spec).
  // 2. Org member with PROVIDER entitlement → /provider.
  // 3. Org member with SC entitlement → /sc.
  // 4. Neither → /no-org for setup.
  //
  // Edge case: a user who is BOTH a worker AND a manager hits /app
  // here. They can still navigate to /provider manually — workers
  // are the primary persona for the PWA so default there.
  const userId = session.user.id;
  const [workerProfile, membership] = await Promise.all([
    db.worker.findFirst({
      where: { userId },
      select: { id: true },
    }),
    db.orgMembership.findFirst({
      where: { userId },
      select: {
        org: { select: { entitlements: { where: { active: true } } } },
      },
    }),
  ]);

  if (workerProfile) redirect("/app");

  if (membership) {
    const portals = membership.org.entitlements.map((e) => e.portal);
    if (portals.includes("PROVIDER")) redirect("/provider");
    if (portals.includes("SC")) redirect("/sc");
  }

  redirect("/no-org");
}