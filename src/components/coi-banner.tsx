import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import type { PortalKey } from "@/lib/portal";

/**
 * Banner shown on every authenticated page when the user's active org has
 * both Provider + SC entitlements but no signed Conflict of Interest form.
 * Renders nothing for non-hybrid orgs or already-signed hybrids.
 */
export async function CoIBanner({
  orgId,
  availablePortals,
}: {
  orgId: string;
  availablePortals: PortalKey[];
}) {
  if (availablePortals.length < 2) return null;

  const form = await db.conflictOfInterestForm.findUnique({
    where: { orgId },
    select: { signedAt: true },
  });
  if (form?.signedAt) return null;

  return (
    <div className="border-b bg-amber-50/60 px-6 py-3 dark:bg-amber-950/20">
      <div className="mx-auto max-w-7xl">
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Conflict of Interest not signed</AlertTitle>
          <AlertDescription>
            Your organisation holds both Provider and Support Coordination
            entitlements — NDIS Practice Standards require an acknowledgement.
          </AlertDescription>
          <AlertAction>
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/provider/conflict-of-interest" />}
            >
              Sign now
            </Button>
          </AlertAction>
        </Alert>
      </div>
    </div>
  );
}