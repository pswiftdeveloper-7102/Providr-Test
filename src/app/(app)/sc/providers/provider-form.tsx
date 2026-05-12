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
import { PhoneField } from "@/components/phone-field";

import {
  createProviderAction,
  updateProviderAction,
  type ProviderFormState,
} from "./actions";

const initial: ProviderFormState = {};

export type ProviderFormValues = {
  name: string;
  abn: string | null;
  ndisRegistrationNumber: string | null;
  serviceCategories: string | null;
  rating: number | null;
  capacityStatus: string | null;
  rateNotes: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
};

type Props = {
  cancelHref: string;
  providerId?: string;
  values?: ProviderFormValues;
};

export function ProviderForm({ cancelHref, providerId, values }: Props) {
  const isEdit = !!providerId;
  const action = isEdit
    ? updateProviderAction.bind(null, providerId!)
    : createProviderAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction}>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Who is this provider?</CardTitle>
            <CardDescription>
              Capture the basics — your future self will want to find them
              fast when a participant needs a service.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              name="name"
              label="Provider name"
              required
              defaultValue={values?.name}
              error={state.fieldErrors?.name}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="abn"
                label="ABN"
                defaultValue={values?.abn}
                error={state.fieldErrors?.abn}
              />
              <Field
                name="ndisRegistrationNumber"
                label="NDIS registration"
                defaultValue={values?.ndisRegistrationNumber}
                error={state.fieldErrors?.ndisRegistrationNumber}
              />
            </div>
            <Field
              name="serviceCategories"
              label="Service categories"
              placeholder="Support work, OT, speech pathology…"
              defaultValue={values?.serviceCategories}
              error={state.fieldErrors?.serviceCategories}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Working with them</CardTitle>
            <CardDescription>
              Quality and capacity notes for your matchmaking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="rating"
                label="Rating (1–5)"
                type="number"
                min="1"
                max="5"
                defaultValue={values?.rating?.toString() ?? ""}
                error={state.fieldErrors?.rating}
              />
              <Field
                name="capacityStatus"
                label="Capacity"
                placeholder="accepting / waitlist / full"
                defaultValue={values?.capacityStatus}
                error={state.fieldErrors?.capacityStatus}
              />
            </div>
            <Area
              name="rateNotes"
              label="Rate notes"
              defaultValue={values?.rateNotes}
              placeholder="Hourly rate, after-hours loading, anything quirky about how they bill."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                name="contactName"
                label="Contact name"
                defaultValue={values?.contactName}
              />
              <PhoneField
                name="contactPhone"
                defaultValue={values?.contactPhone}
              />
            </div>
            <Field
              name="contactEmail"
              label="Email"
              type="email"
              defaultValue={values?.contactEmail}
              error={state.fieldErrors?.contactEmail}
            />
            <Area
              name="notes"
              label="Notes"
              defaultValue={values?.notes}
              placeholder="Anything else worth remembering."
            />
          </CardContent>
        </Card>

        <FormError message={state.error} />

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" render={<Link href={cancelHref} />}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save changes"
                : "Add provider"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  error,
  placeholder,
  defaultValue,
  min,
  max,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  defaultValue?: string | null;
  min?: string;
  max?: string;
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
        defaultValue={defaultValue ?? ""}
        min={min}
        max={max}
        aria-invalid={!!error}
        required={required}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Area({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        id={name}
        name={name}
        rows={3}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
      />
    </div>
  );
}