import Link from "next/link";

import { AppAuthLayout } from "@/components/app-auth-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { AcceptInviteForm } from "./accept-invite-form";
import { checkInviteAction } from "./actions";

export default async function AppWorkerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const check = await checkInviteAction(token);

  return (
    <AppAuthLayout
      title="Welcome to the Worker App"
      subtitle={
        check.ok
          ? `Hi ${check.workerName}, set a password to access your shifts and log incidents.`
          : "We couldn't accept this invite."
      }
      footer={
        check.ok ? (
          <p className="text-xs text-muted-foreground">
            Already set up?{" "}
            <Link
              href="/app/login"
              className="font-semibold text-foreground hover:underline"
            >
              Sign in
            </Link>
          </p>
        ) : null
      }
    >
      {check.ok ? (
        <AcceptInviteForm token={token} email={check.email} />
      ) : (
        <Alert>
          <AlertTitle>Invite unavailable</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{check.error}</p>
            <Button
              variant="outline"
              size="sm"
              render={<Link href="/app/login" />}
            >
              Go to Worker App sign in
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </AppAuthLayout>
  );
}