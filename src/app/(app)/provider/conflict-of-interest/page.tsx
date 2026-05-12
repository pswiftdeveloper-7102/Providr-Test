import { redirect } from "next/navigation";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

import { SignCoIForm } from "./sign-form";

export default async function ConflictOfInterestPage() {
  const context = await resolvePortalContext("provider");

  // If the org doesn't hold both entitlements, there's no conflict — bounce.
  if (context.availablePortals.length < 2) {
    redirect("/provider");
  }

  const form = await db.conflictOfInterestForm.findUnique({
    where: { orgId: context.activeOrg.id },
  });
  const signed = !!form?.signedAt;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Conflict of Interest
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Required for hybrid Provider + Support Coordination organisations.
          </p>
        </div>
        {signed ? (
          <Badge variant="outline" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Signed
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Not signed
          </Badge>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Why this exists</CardTitle>
          <CardDescription>
            Your organisation holds both Provider and Support Coordination
            entitlements. NDIS Practice Standards require that conflicts
            between these two roles are disclosed and managed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            A Support Coordinator&apos;s job is to find the best providers for
            a participant. When your own organisation also delivers services,
            participants must be told this and must not be pressured to use
            related services.
          </p>
          <p>
            Signing this acknowledgement records that your organisation
            understands the obligation. It does not replace the
            participant-facing disclosure you&apos;ll provide to each person
            you support.
          </p>
        </CardContent>
      </Card>

      {signed ? (
        <Card>
          <CardHeader>
            <CardTitle>Signed acknowledgement</CardTitle>
            <CardDescription>
              Recorded{" "}
              {form?.signedAt
                ? format(form.signedAt, "dd/MM/yyyy 'at' h:mm a")
                : ""}
              .
            </CardDescription>
          </CardHeader>
          {form?.notes && (
            <CardContent>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {form.notes}
              </p>
            </CardContent>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sign the acknowledgement</CardTitle>
            <CardDescription>
              One time per organisation. Re-sign if your arrangement changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignCoIForm />
          </CardContent>
        </Card>
      )}
    </div>
  );
}