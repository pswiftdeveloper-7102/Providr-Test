"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, Copy, Send } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { inviteWorkerAction, type InviteWorkerState } from "./invite-actions";

const initial: InviteWorkerState = {};

type Props = {
  workerId: string;
  hasLogin: boolean;
  workerEmail: string | null;
  workerFirstName: string;
};

export function InvitePanel({
  workerId,
  hasLogin,
  workerEmail,
  workerFirstName,
}: Props) {
  const [state, dispatch, pending] = useActionState(
    inviteWorkerAction.bind(null, workerId),
    initial
  );
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!state.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Browser blocked clipboard — the user can still select & copy.
    }
  };

  if (hasLogin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Worker login</CardTitle>
          <CardDescription>
            {workerFirstName} has claimed a login and can sign into the
            worker portal at /worker.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Invite to the worker portal</CardTitle>
        <CardDescription>
          Generate a one-time link {workerFirstName} can use to set a
          password and sign in. Links expire after 14 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!workerEmail && (
          <Alert>
            <AlertDescription>
              Add an email address to this worker&apos;s profile to enable
              invites.
            </AlertDescription>
          </Alert>
        )}
        <form action={dispatch}>
          <Button
            type="submit"
            disabled={pending || !workerEmail}
            size="sm"
            variant="outline"
          >
            <Send />
            {pending ? "Generating link…" : "Generate invite link"}
          </Button>
        </form>

        {state.error && (
          <Alert>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {state.ok && state.inviteUrl && (
          <Alert>
            <CheckCircle2 />
            <AlertTitle>Invite link ready</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-xs">
                Share this link with {workerFirstName}. We&apos;ll send these
                by email once that channel is wired up; for now, copy it
                manually.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={state.inviteUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  className="text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onCopy}
                >
                  <Copy />
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}