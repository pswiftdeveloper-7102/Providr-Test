"use client";

import { useActionState } from "react";
import { CheckCircle2, Info } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";

import {
  saveComplianceContactAction,
  type SaveComplianceContactState,
} from "./actions";

const initial: SaveComplianceContactState = {};

type Initial = {
  name: string;
  role: string;
  email: string;
  phone: string;
  notes: string;
};

export function ComplianceContactForm({
  initial: pre,
  transportStatus,
}: {
  initial: Initial;
  transportStatus: { emailEnabled: boolean; smsEnabled: boolean };
}) {
  const [state, dispatch, pending] = useActionState(
    saveComplianceContactAction,
    initial
  );

  return (
    <div className="space-y-4">
      {(!transportStatus.emailEnabled || !transportStatus.smsEnabled) && (
        <Alert>
          <Info />
          <AlertTitle>Transports not fully configured</AlertTitle>
          <AlertDescription className="space-y-1 text-xs">
            <p>
              {transportStatus.emailEnabled
                ? "Email transport is live."
                : "Email is in simulated mode — set RESEND_API_KEY to start sending."}
            </p>
            <p>
              {transportStatus.smsEnabled
                ? "SMS transport is live."
                : "SMS is in simulated mode — set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to start sending."}
            </p>
            <p>
              While simulated, dispatches are logged to the server console
              and not actually delivered.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <form action={dispatch}>
        <Card>
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
            <CardDescription>
              Required for reportable-incident routing. SMS is sent for
              reportable incidents only — email for all push-eligible
              alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cc-name">
                  Name<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="cc-name"
                  name="name"
                  defaultValue={pre.name}
                  required
                  aria-invalid={!!state.fieldErrors?.name}
                />
                {state.fieldErrors?.name && (
                  <p className="text-xs text-destructive">
                    {state.fieldErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc-role">Role / title</Label>
                <Input
                  id="cc-role"
                  name="role"
                  defaultValue={pre.role}
                  placeholder="e.g. Quality & Safeguards Manager"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cc-email">Email</Label>
                <Input
                  id="cc-email"
                  name="email"
                  type="email"
                  defaultValue={pre.email}
                  placeholder="quality@example.org.au"
                  aria-invalid={!!state.fieldErrors?.email}
                />
                {state.fieldErrors?.email && (
                  <p className="text-xs text-destructive">
                    {state.fieldErrors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc-phone">Phone (E.164)</Label>
                <Input
                  id="cc-phone"
                  name="phone"
                  defaultValue={pre.phone}
                  placeholder="+61412345678"
                  aria-invalid={!!state.fieldErrors?.phone}
                />
                {state.fieldErrors?.phone && (
                  <p className="text-xs text-destructive">
                    {state.fieldErrors.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-notes">Notes</Label>
              <Textarea
                id="cc-notes"
                name="notes"
                rows={3}
                defaultValue={pre.notes}
                placeholder="Office hours, escalation paths, etc."
              />
            </div>

            <FormError message={state.error} />

            {state.ok && (
              <Alert>
                <CheckCircle2 />
                <AlertTitle>Saved</AlertTitle>
                <AlertDescription>
                  Compliance contact updated. New reportable incidents will
                  route here from now on.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save contact"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}