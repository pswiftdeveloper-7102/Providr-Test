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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";
import { DateField } from "@/components/date-field";

import {
  createAgreementAction,
  type CreateAgreementState,
} from "../actions";

const initial: CreateAgreementState = {};

export function AgreementForm({
  participantId,
  cancelHref,
}: {
  participantId: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    createAgreementAction.bind(null, participantId),
    initial
  );

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Agreement details</CardTitle>
          <CardDescription>
            Most NDIS service agreements run for the length of the plan year.
            Leave the signed date empty to file as Draft. If you don&apos;t
            upload a signed copy or paste an external link, we&apos;ll
            generate the PDF from your org and participant details — then
            you can download it, sign it, and re-upload.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DateField name="startDate" label="Start date" required error={state.fieldErrors?.startDate} />
            <DateField name="endDate" label="End date" error={state.fieldErrors?.endDate} />
          </div>

          <DateField
            name="signedAt"
            label="Date signed by participant"
            error={state.fieldErrors?.signedAt}
            helperText="Setting this marks the agreement as Active. Leave blank to keep it as Draft."
          />

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="documentFile">Signed document</Label>
            <Input
              id="documentFile"
              name="documentFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
              aria-invalid={!!state.fieldErrors?.documentFile}
            />
            <p className="text-xs text-muted-foreground">
              Upload the signed PDF (max 10 MB). PDF, JPEG, PNG, or WebP.
            </p>
            {state.fieldErrors?.documentFile && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.documentFile}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="documentUrl">…or external link</Label>
            <Input
              id="documentUrl"
              name="documentUrl"
              type="url"
              placeholder="https://… Google Drive, SharePoint, etc."
              aria-invalid={!!state.fieldErrors?.documentUrl}
            />
            <p className="text-xs text-muted-foreground">
              Use this if the document already lives somewhere your team
              uses. The file upload above is preferred for new agreements.
            </p>
            {state.fieldErrors?.documentUrl && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.documentUrl}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Services agreed & notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Describe the supports you'll deliver — scope, weekly hours, support categories, any agreed exclusions or special terms. This goes into the generated PDF under Services agreed."
            />
            <p className="text-xs text-muted-foreground">
              This appears as the &quot;Services agreed&quot; section of the
              auto-generated agreement PDF.
            </p>
          </div>

          <FormError message={state.error} />

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" render={<Link href={cancelHref} />}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save agreement"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}