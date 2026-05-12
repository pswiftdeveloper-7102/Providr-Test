"use client";

import Link from "next/link";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";

import {
  acceptWorkerInviteAction,
  type AcceptWorkerInviteState,
} from "./actions";

const initial: AcceptWorkerInviteState = {};

export function AcceptInviteForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, dispatch, pending] = useActionState(
    acceptWorkerInviteAction.bind(null, token),
    initial
  );

  if (state.ok) {
    return (
      <Alert>
        <CheckCircle2 />
        <AlertTitle>You&apos;re all set</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Sign in with {state.workerEmail ?? email} and the password you
            just created.
          </p>
          <Button size="sm" render={<Link href="/login" />}>
            Sign in
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={dispatch} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email</Label>
        <Input id="invite-email" value={email} readOnly />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Set a password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          aria-invalid={!!state.fieldErrors?.password}
        />
        {state.fieldErrors?.password && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.password}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          minLength={8}
          required
          aria-invalid={!!state.fieldErrors?.confirmPassword}
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      <FormError message={state.error} />

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Setting up…" : "Create my login"}
      </Button>
    </form>
  );
}