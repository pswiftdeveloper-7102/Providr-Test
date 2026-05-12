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
import { FormError } from "@/components/form-error";

import {
  createParticipantAction,
  type CreateParticipantState,
} from "./actions";

const initialState: CreateParticipantState = {};

export default function NewParticipantPage() {
  const [state, formAction, pending] = useActionState(
    createParticipantAction,
    initialState
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          New participant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture the basics now — you can add their NDIS plan and care plan
          afterwards.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Only first and last name are required to create the record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="firstName"
                label="First name"
                required
                error={state.fieldErrors?.firstName}
              />
              <Field
                id="lastName"
                label="Last name"
                required
                error={state.fieldErrors?.lastName}
              />
            </div>

            <Field
              id="pronouns"
              label="Pronouns"
              placeholder="e.g. she/her"
              error={state.fieldErrors?.pronouns}
            />

            <Field
              id="ndisNumber"
              label="NDIS number"
              placeholder="9 digits"
              error={state.fieldErrors?.ndisNumber}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="dateOfBirth"
                label="Date of birth"
                type="date"
                max={todayLocalDate()}
                helperText="dd/mm/yyyy — can't be in the future"
                error={state.fieldErrors?.dateOfBirth}
              />
              <Field
                id="phone"
                label="Phone"
                type="tel"
                error={state.fieldErrors?.phone}
              />
            </div>

            <Field
              id="email"
              label="Email"
              type="email"
              error={state.fieldErrors?.email}
            />

            <FormError message={state.error} />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                render={<Link href="/provider/participants" />}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create participant"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  max?: string;
  helperText?: string;
};

function Field({
  id,
  label,
  type,
  placeholder,
  required,
  error,
  max,
  helperText,
}: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        max={max}
      />
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function todayLocalDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}