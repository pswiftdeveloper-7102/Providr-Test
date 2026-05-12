"use client";

import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/form-error";

import {
  requestPasswordResetAction,
  type ForgotPasswordState,
} from "./actions";

const initial: ForgotPasswordState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordResetAction,
    initial
  );

  if (state.ok) {
    return (
      <div className="space-y-3">
        <Alert>
          <AlertTitle>Check your email</AlertTitle>
          <AlertDescription>
            If an account exists for that email, a reset link has been
            generated. The link expires in one hour.
          </AlertDescription>
        </Alert>
        {state.resetUrl && (
          <Alert>
            <AlertTitle>Development mode</AlertTitle>
            <AlertDescription>
              Email transport isn&apos;t configured yet, so here is the
              reset link directly:
              <br />
              <a
                href={state.resetUrl}
                className="break-all text-xs text-foreground underline underline-offset-2"
              >
                {state.resetUrl}
              </a>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@org.com.au"
          required
          aria-invalid={!!state.fieldErrors?.email}
        />
        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.email}
          </p>
        )}
      </div>
      <FormError message={state.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}