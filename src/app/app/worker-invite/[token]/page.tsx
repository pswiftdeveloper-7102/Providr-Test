import Link from "next/link";

import { AppAuthLayout } from "@/components/app-auth-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";

import { AcceptInviteForm } from "./accept-invite-form";
import { checkInviteAction } from "./actions";

export default async function AppWorkerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [check, session] = await Promise.all([
    checkInviteAction(token),
    auth(),
  ]);

  // If a different user is already signed in (e.g. the manager who
  // generated the link is testing it themselves), warn them — accepting
  // the invite swaps the session to the new worker.
  const otherSession =
    check.ok &&
    session?.user?.email &&
    session.user.email.toLowerCase() !== check.email.toLowerCase()
      ? session.user.email
      : null;

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
        <div className="space-y-4">
          {otherSession && (
            <Alert>
              <AlertTitle>Signed in as {otherSession}</AlertTitle>
              <AlertDescription>
                Setting a password here will sign you out of that account
                and into {check.email} on this device.
              </AlertDescription>
            </Alert>
          )}
          <AcceptInviteForm token={token} email={check.email} />
        </div>
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