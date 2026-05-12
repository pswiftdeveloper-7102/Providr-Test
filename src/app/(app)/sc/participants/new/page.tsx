"use client";

import Link from "next/link";
import { useActionState } from "react";

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
  createSCParticipantAction,
  type CreateParticipantState,
} from "../actions";

const initial: CreateParticipantState = {};

export default function NewSCParticipantPage() {
  const [state, formAction, pending] = useActionState(
    createSCParticipantAction,
    initial
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          New participant
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Add a participant to your caseload
        </h1>
      </header>

      <form action={formAction}>
        <Card>
          <CardHeader>
            <CardTitle>Who is this person?</CardTitle>
            <CardDescription>
              Just the basics. Plans, providers, and goals come next.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="firstName"
                label="First name"
                required
                error={state.fieldErrors?.firstName}
              />
              <Field
                name="lastName"
                label="Last name"
                required
                error={state.fieldErrors?.lastName}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="ndisNumber"
                label="NDIS number"
                error={state.fieldErrors?.ndisNumber}
                placeholder="e.g. 4300012345"
              />
              <Field
                name="dateOfBirth"
                label="Date of birth"
                type="date"
                error={state.fieldErrors?.dateOfBirth}
              />
            </div>

            <Field
              name="pronouns"
              label="Pronouns"
              error={state.fieldErrors?.pronouns}
              placeholder="e.g. she/her"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="email"
                type="email"
                label="Email"
                error={state.fieldErrors?.email}
              />
              <Field
                name="phone"
                type="tel"
                label="Phone"
                error={state.fieldErrors?.phone}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                rows={2}
                aria-invalid={!!state.fieldErrors?.address}
              />
            </div>

            <FormError message={state.error} />

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" render={<Link href="/sc/participants" />}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create participant"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  error,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        aria-invalid={!!error}
        required={required}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}