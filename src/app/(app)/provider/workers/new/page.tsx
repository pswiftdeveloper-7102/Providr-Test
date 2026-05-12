"use client";

// NOTE: the manager-only gate for this route is enforced server-side in
// `createWorkerAction` (assertManager). Client-side, the workers nav link
// is hidden for support-worker-only users in nav-sidebar.

import Link from "next/link";
import { useActionState, useState } from "react";

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
import { PhoneField } from "@/components/phone-field";
import { DateField } from "@/components/date-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FormError } from "@/components/form-error";
import {
  WORKER_TYPE_DESCRIPTION,
  WORKER_TYPE_LABEL,
  WORKER_TYPES,
} from "@/lib/worker-type";
import type { WorkerType } from "@prisma/client";

import {
  createWorkerAction,
  type CreateWorkerState,
} from "./actions";

const initialState: CreateWorkerState = {};

export default function NewWorkerPage() {
  const [state, formAction, pending] = useActionState(
    createWorkerAction,
    initialState
  );
  const [type, setType] = useState<WorkerType>("SUPPORT_WORKER");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          New support worker
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture basics now. Certificates can be filled in here or added
          later from the worker&apos;s profile.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Only first and last name are required to create the worker.
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="email"
                label="Email"
                type="email"
                error={state.fieldErrors?.email}
              />
              <PhoneField
                name="phone"
                error={state.fieldErrors?.phone}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Worker type<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => v && setType(v as WorkerType)}
              >
                <SelectTrigger
                  id="type"
                  className="w-full"
                  aria-invalid={!!state.fieldErrors?.type}
                >
                  <SelectValue>{WORKER_TYPE_LABEL[type]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {WORKER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {WORKER_TYPE_LABEL[t]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {WORKER_TYPE_DESCRIPTION[t]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.fieldErrors?.type && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors.type}
                </p>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-medium">Certifications</h3>
              <p className="text-xs text-muted-foreground">
                When set, expired certificates will block rostering.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DateField
                name="ndisWorkerCheckExpiry"
                label="NDIS Worker Check expiry"
                error={state.fieldErrors?.ndisWorkerCheckExpiry}
              />
              <DateField
                name="firstAidExpiry"
                label="First Aid expiry"
                error={state.fieldErrors?.firstAidExpiry}
              />
            </div>

            <FormError message={state.error} />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                render={<Link href="/provider/workers" />}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Creating…" : "Create worker"}
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
  required?: boolean;
  error?: string;
};

function Field({ id, label, type, required, error }: FieldProps) {
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
        required={required}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}