"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { FormError } from "@/components/form-error";
import { PhoneField } from "@/components/phone-field";
import {
  CERT_LABEL,
  certStatus,
  type CertStatus,
} from "@/lib/certificates";

import {
  deleteWorkerAction,
  updateWorkerAction,
  type UpdateWorkerState,
} from "./actions";

type WorkerData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  ndisWorkerCheckExpiry: Date | null;
  firstAidExpiry: Date | null;
};

const initialState: UpdateWorkerState = {};

export function WorkerEditForm({ worker }: { worker: WorkerData }) {
  const [state, formAction, pending] = useActionState(
    updateWorkerAction.bind(null, worker.id),
    initialState
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const ndis = certStatus(worker.ndisWorkerCheckExpiry);
  const firstAid = certStatus(worker.firstAidExpiry);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Certificate status</CardTitle>
          <CardDescription>
            Expired or missing certificates will block rostering once shifts
            are live.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CertRow
            label="NDIS Worker Check"
            status={ndis}
            expiry={worker.ndisWorkerCheckExpiry}
          />
          <CertRow
            label="First Aid"
            status={firstAid}
            expiry={worker.firstAidExpiry}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="firstName"
                label="First name"
                required
                defaultValue={worker.firstName}
                error={state.fieldErrors?.firstName}
              />
              <Field
                id="lastName"
                label="Last name"
                required
                defaultValue={worker.lastName}
                error={state.fieldErrors?.lastName}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="email"
                label="Email"
                type="email"
                defaultValue={worker.email ?? ""}
                error={state.fieldErrors?.email}
              />
              <PhoneField
                name="phone"
                defaultValue={worker.phone}
                error={state.fieldErrors?.phone}
              />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="ndisWorkerCheckExpiry"
                label="NDIS Worker Check expiry"
                type="date"
                defaultValue={
                  worker.ndisWorkerCheckExpiry
                    ? worker.ndisWorkerCheckExpiry
                        .toISOString()
                        .slice(0, 10)
                    : ""
                }
                error={state.fieldErrors?.ndisWorkerCheckExpiry}
              />
              <Field
                id="firstAidExpiry"
                label="First Aid expiry"
                type="date"
                defaultValue={
                  worker.firstAidExpiry
                    ? worker.firstAidExpiry.toISOString().slice(0, 10)
                    : ""
                }
                error={state.fieldErrors?.firstAidExpiry}
              />
            </div>

            <FormError message={state.error} />
            {state.ok && (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Saved.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                render={<Link href="/provider/workers" />}
              >
                Back to workers
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Deleting a worker also removes their shift history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmingDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm">
                Are you sure? This can&apos;t be undone.
              </p>
              <form action={deleteWorkerAction.bind(null, worker.id)}>
                <Button type="submit" variant="destructive">
                  Yes, delete
                </Button>
              </form>
              <Button
                variant="ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              <Trash2 />
              Delete worker
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CertRow({
  label,
  status,
  expiry,
}: {
  label: string;
  status: CertStatus;
  expiry: Date | null;
}) {
  const dot =
    status === "expired"
      ? "bg-destructive"
      : status === "expiring"
        ? "bg-amber-500"
        : status === "active"
          ? "bg-emerald-500"
          : "bg-muted-foreground/40";

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-xs">
          {expiry ? format(expiry, "dd/MM/yyyy") : "Not set"}
        </span>
        <Badge variant={status === "expired" ? "destructive" : "outline"}>
          {CERT_LABEL[status]}
        </Badge>
      </div>
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
};

function Field({ id, label, type, required, defaultValue, error }: FieldProps) {
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
        defaultValue={defaultValue}
        aria-invalid={!!error}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}