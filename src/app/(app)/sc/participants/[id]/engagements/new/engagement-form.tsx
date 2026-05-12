"use client";

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
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";

import {
  createEngagementAction,
  type EngagementFormState,
} from "../actions";

const initial: EngagementFormState = {};

const STATUSES = [
  { value: "PROPOSED", label: "Proposed — exploring fit" },
  { value: "AGREEMENT_SENT", label: "Agreement sent — awaiting sign-off" },
  { value: "ACTIVE", label: "Active — delivering" },
  { value: "ENDED", label: "Ended" },
  { value: "DECLINED", label: "Declined" },
] as const;

type Status = (typeof STATUSES)[number]["value"];

type Provider = {
  id: string;
  name: string;
  capacityStatus: string | null;
  serviceCategories: string | null;
};

export function EngagementForm({
  participantId,
  providers,
  cancelHref,
}: {
  participantId: string;
  providers: Provider[];
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(
    createEngagementAction.bind(null, participantId),
    initial
  );
  const [providerId, setProviderId] = useState("");
  const [status, setStatus] = useState<Status>("PROPOSED");

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Engagement details</CardTitle>
          <CardDescription>
            Pick the provider and tag where the relationship is. You can
            update as it moves.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="externalProviderId">
              Provider<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select
              name="externalProviderId"
              value={providerId}
              onValueChange={(v) => setProviderId(v ?? "")}
            >
              <BrandedSelectTrigger
                id="externalProviderId"
                className="w-full"
                aria-invalid={!!state.fieldErrors?.externalProviderId}
              >
                <SelectValue placeholder="Choose from your directory" />
              </BrandedSelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <BrandedSelectItem key={p.id} value={p.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[p.serviceCategories, p.capacityStatus]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </span>
                    </div>
                  </BrandedSelectItem>
                ))}
              </SelectContent>
            </Select>
            {state.fieldErrors?.externalProviderId && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.externalProviderId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              value={status}
              onValueChange={(v) => v && setStatus(v as Status)}
            >
              <BrandedSelectTrigger id="status" className="w-full">
                <SelectValue />
              </BrandedSelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <BrandedSelectItem key={s.value} value={s.value}>
                    {s.label}
                  </BrandedSelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startedAt">Started</Label>
              <Input id="startedAt" name="startedAt" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endedAt">Ended (if applicable)</Label>
              <Input id="endedAt" name="endedAt" type="date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceSummary">Service summary</Label>
            <Textarea
              id="serviceSummary"
              name="serviceSummary"
              rows={2}
              placeholder="E.g. 12 hours/week support work, evenings and weekends."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Anything else worth remembering about this engagement."
            />
          </div>

          <FormError message={state.error} />

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" render={<Link href={cancelHref} />}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Engage provider"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}