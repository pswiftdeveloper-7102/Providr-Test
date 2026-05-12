"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Heart, Network, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";
import { PhoneField } from "@/components/phone-field";

import {
  addInformalSupportAction,
  deleteInformalSupportAction,
  addExternalContactAction,
  deleteExternalContactAction,
  type InformalSupportState,
  type ExternalContactState,
} from "./actions";

const RELATIONSHIPS = [
  { value: "FAMILY", label: "Family" },
  { value: "FRIEND", label: "Friend" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "ADVOCATE", label: "Advocate" },
  { value: "OTHER", label: "Other" },
] as const;

type Relationship = (typeof RELATIONSHIPS)[number]["value"];

const CONTACT_TYPES = [
  { value: "NDIA_PLANNER", label: "NDIA planner" },
  { value: "PLAN_MANAGER", label: "Plan manager" },
  { value: "GP", label: "GP" },
  { value: "HOSPITAL", label: "Hospital coordinator" },
  { value: "ALLIED_HEALTH", label: "Allied health" },
  { value: "MENTAL_HEALTH", label: "Mental health team" },
  { value: "HOUSING", label: "Housing service" },
  { value: "EDUCATION", label: "Education" },
  { value: "OTHER", label: "Other" },
] as const;

type ContactType = (typeof CONTACT_TYPES)[number]["value"];

const CONTACT_TYPE_LABEL = Object.fromEntries(
  CONTACT_TYPES.map((c) => [c.value, c.label])
) as Record<string, string>;

const RELATIONSHIP_LABEL = Object.fromEntries(
  RELATIONSHIPS.map((r) => [r.value, r.label])
) as Record<string, string>;

type InformalSupport = {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isPrimary: boolean;
};

type ExternalContact = {
  id: string;
  type: string;
  organisationName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

const initialInformal: InformalSupportState = {};
const initialExternal: ExternalContactState = {};

export function NetworkSection({
  participantId,
  informalSupports,
  externalContacts,
}: {
  participantId: string;
  informalSupports: InformalSupport[];
  externalContacts: ExternalContact[];
}) {
  return (
    <div className="space-y-6">
      <InformalSupports
        participantId={participantId}
        supports={informalSupports}
      />
      <ExternalContacts
        participantId={participantId}
        contacts={externalContacts}
      />
    </div>
  );
}

function InformalSupports({
  participantId,
  supports,
}: {
  participantId: string;
  supports: InformalSupport[];
}) {
  const [state, formAction, pending] = useActionState(
    addInformalSupportAction.bind(null, participantId),
    initialInformal
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [relationship, setRelationship] = useState<Relationship>("FAMILY");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setRelationship("FAMILY");
      setShowAdd(false);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Heart className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>Informal supports</CardTitle>
            <CardDescription>
              Family, friends, guardians, advocates — the people the
              participant relies on outside paid services.
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : "Add support"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <form ref={formRef} action={formAction} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="informal-name">
                  Name<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="informal-name"
                  name="name"
                  aria-invalid={!!state.fieldErrors?.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="informal-relationship">Relationship</Label>
                <Select
                  name="relationship"
                  value={relationship}
                  onValueChange={(v) =>
                    v && setRelationship(v as Relationship)
                  }
                >
                  <BrandedSelectTrigger
                    id="informal-relationship"
                    className="w-full"
                  >
                    <SelectValue />
                  </BrandedSelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((r) => (
                      <BrandedSelectItem key={r.value} value={r.value}>
                        {r.label}
                      </BrandedSelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="informal-phone">Phone</Label>
                <PhoneField name="phone" label="Phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="informal-email">Email</Label>
                <Input id="informal-email" name="email" type="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="informal-notes">Notes</Label>
              <Textarea id="informal-notes" name="notes" rows={2} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="isPrimary" />
              Primary contact (call first in an emergency)
            </label>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Add"}
              </Button>
            </div>
          </form>
        )}

        {supports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No informal supports captured yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {supports.map((s) => (
              <li
                key={s.id}
                className="rounded-md border bg-muted/30 px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {s.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {RELATIONSHIP_LABEL[s.relationship]}
                    </span>
                    {s.isPrimary && (
                      <Badge
                        variant="secondary"
                        className="ml-2 text-[10px]"
                      >
                        primary
                      </Badge>
                    )}
                  </span>
                  <form
                    action={deleteInformalSupportAction.bind(null, s.id)}
                  >
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      aria-label="Remove support"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
                {(s.phone || s.email) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[s.phone, s.email].filter(Boolean).join(" · ")}
                  </p>
                )}
                {s.notes && (
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                    {s.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <FormError message={state.error} />
      </CardContent>
    </Card>
  );
}

function ExternalContacts({
  participantId,
  contacts,
}: {
  participantId: string;
  contacts: ExternalContact[];
}) {
  const [state, formAction, pending] = useActionState(
    addExternalContactAction.bind(null, participantId),
    initialExternal
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<ContactType>("NDIA_PLANNER");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setType("NDIA_PLANNER");
      setShowAdd(false);
    }
  }, [state]);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Network className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>External contacts</CardTitle>
            <CardDescription>
              NDIA planner, GP, hospital, housing, mental health — the
              system the SC bridges to.
            </CardDescription>
          </div>
        </div>
        <CardAction>
          <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "Cancel" : "Add contact"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAdd && (
          <form ref={formRef} action={formAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="external-type">Type</Label>
              <Select
                name="type"
                value={type}
                onValueChange={(v) => v && setType(v as ContactType)}
              >
                <BrandedSelectTrigger id="external-type" className="w-full">
                  <SelectValue />
                </BrandedSelectTrigger>
                <SelectContent>
                  {CONTACT_TYPES.map((t) => (
                    <BrandedSelectItem key={t.value} value={t.value}>
                      {t.label}
                    </BrandedSelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="external-org">Organisation</Label>
                <Input
                  id="external-org"
                  name="organisationName"
                  placeholder="e.g. Royal Adelaide Hospital"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="external-contact">Contact name</Label>
                <Input id="external-contact" name="contactName" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="external-phone">Phone</Label>
                <PhoneField name="phone" label="Phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="external-email">Email</Label>
                <Input id="external-email" name="email" type="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="external-notes">Notes</Label>
              <Textarea id="external-notes" name="notes" rows={2} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Add"}
              </Button>
            </div>
          </form>
        )}

        <Separator />

        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No external contacts captured yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="rounded-md border bg-muted/30 px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {c.organisationName ??
                      c.contactName ??
                      CONTACT_TYPE_LABEL[c.type]}
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      {CONTACT_TYPE_LABEL[c.type]}
                    </Badge>
                  </span>
                  <form action={deleteExternalContactAction.bind(null, c.id)}>
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      aria-label="Remove contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
                {c.contactName && c.organisationName && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.contactName}
                  </p>
                )}
                {(c.phone || c.email) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[c.phone, c.email].filter(Boolean).join(" · ")}
                  </p>
                )}
                {c.notes && (
                  <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                    {c.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <FormError message={state.error} />
      </CardContent>
    </Card>
  );
}