import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { AcceptInviteForm } from "./accept-invite-form";
import { checkInviteAction } from "./actions";

export default async function WorkerInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const check = await checkInviteAction(token);

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to the Worker App</CardTitle>
          <CardDescription>
            {check.ok
              ? `Hi ${check.workerName}, set a password to access your shifts and log incidents.`
              : "We couldn't accept this invite."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {check.ok ? (
            <AcceptInviteForm token={token} email={check.email} />
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-destructive">{check.error}</p>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/app/login" />}
              >
                Go to Worker App sign in
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}