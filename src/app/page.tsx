import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Dispatch to the right portal: org members go to provider/sc based on
  // entitlements; support workers (Worker.userId === session user) without
  // an org membership go to /worker.
  const userId = session.user.id;
  const [membership, workerProfile] = await Promise.all([
    db.orgMembership.findFirst({
      where: { userId },
      select: {
        org: { select: { entitlements: { where: { active: true } } } },
      },
    }),
    db.worker.findFirst({
      where: { userId },
      select: { id: true },
    }),
  ]);

  if (membership) {
    const portals = membership.org.entitlements.map((e) => e.portal);
    if (portals.includes("PROVIDER")) redirect("/provider");
    if (portals.includes("SC")) redirect("/sc");
  }
  if (workerProfile) redirect("/worker");
  redirect("/no-org");
}