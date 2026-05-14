"use client";

import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormError } from "@/components/form-error";

import {
  inviteWorkerFromSettingsAction,
  type InviteWorkerState,
} from "../actions";

const initial: InviteWorkerState = {};

type Participant = {
  id: string;
  name: string;
  ndisNumber: string | null;
};

export function InviteWorkerForm({
  participants,
}: {
  participants: Participant[];
}) {
  const [state, dispatch, pending] = useActionState(
    inviteWorkerFromSettingsAction,
    initial
  );
  const [copied, setCopied] = useState(false);
  const [participantId, setParticipantId] = useState("");

  const onCopy = async () => {
    if (!state.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — user can still select & copy from the input
    }
  };

  return (
    <form action={dispatch}>
      <Card>
        <CardHeader>
          <CardTitle>Worker details</CardTitle>
          <CardDescription>
            Enter the worker&apos;s name and email. We&apos;ll generate a
            one-time link they can use to set a password and sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First name<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="firstName"
                name="firstName"
                autoComplete="given-name"
                required
                aria-invalid={!!state.fieldErrors?.firstName}
              />
              {state.fieldErrors?.firstName && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.firstName}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last name<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="lastName"
                name="lastName"
                autoComplete="family-name"
                required
                aria-invalid={!!state.fieldErrors?.lastName}
              />
              {state.fieldErrors?.lastName && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="worker@example.com.au"
              required
              aria-invalid={!!state.fieldErrors?.email}
            />
            {state.fieldErrors?.email && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="participantId">Participant (optional)</Label>
            <Select
              name="participantId"
              value={participantId}
              onValueChange={(v) => setParticipantId(v ?? "")}
            >
              <SelectTrigger
                id="participantId"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.participantId}
              >
                <SelectValue placeholder="Select a participant to grant access">
                  {participants.find((p) => p.id === participantId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {participants.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No participants yet.
                  </div>
                ) : (
                  participants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-baseline gap-2">
                        <span>{p.name}</span>
                        {p.ndisNumber && (
                          <span className="text-xs text-muted-foreground">
                            #{p.ndisNumber}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {state.fieldErrors?.participantId && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.participantId}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              The worker will be granted access to this participant.
              You can add more later.
            </p>
          </div>

          <FormError message={state.error} />

          {state.ok && state.inviteUrl ? (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Invite ready</AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-xs">
                  Share this link with {state.workerFirstName}. Once email
                  transport is wired up we&apos;ll send these automatically.
                </p>
                <div className="flex flex-wrap items-center gap-2">
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
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href="/provider/settings" />}
                >
                  Back to Settings
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                <Send />
                {pending ? "Generating link…" : "Generate Invite Link"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </form>
  );
}