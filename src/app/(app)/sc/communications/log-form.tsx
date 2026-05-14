"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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
  logCommunicationAction,
  type CommunicationLogState,
} from "./actions";

const initial: CommunicationLogState = {};

const DIRECTIONS = [
  { value: "INBOUND", label: "Inbound" },
  { value: "OUTBOUND", label: "Outbound" },
] as const;

const CHANNELS = [
  { value: "PHONE", label: "Phone" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "IN_PERSON", label: "In person" },
  { value: "VIDEO", label: "Video" },
  { value: "OTHER", label: "Other" },
] as const;

type Direction = (typeof DIRECTIONS)[number]["value"];
type Channel = (typeof CHANNELS)[number]["value"];

type Participant = { id: string; firstName: string; lastName: string };

function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CommunicationLogForm({
  participants,
  defaultParticipantId,
}: {
  participants: Participant[];
  defaultParticipantId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    logCommunicationAction,
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [participantId, setParticipantId] = useState(
    defaultParticipantId ?? ""
  );
  const [direction, setDirection] = useState<Direction>("INBOUND");
  const [channel, setChannel] = useState<Channel>("PHONE");
  const [initialDateTime] = useState(() => nowLocalIso());

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setDirection("INBOUND");
      setChannel("PHONE");
      if (!defaultParticipantId) setParticipantId("");
    }
  }, [state, defaultParticipantId]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {!defaultParticipantId && (
        <div className="space-y-2">
          <Label htmlFor="comm-participant">
            Participant<span className="ml-0.5 text-destructive">*</span>
          </Label>
          <Select
            name="participantId"
            value={participantId}
            onValueChange={(v) => setParticipantId(v ?? "")}
          >
            <BrandedSelectTrigger
              id="comm-participant"
              className="w-full"
              aria-invalid={!!state.fieldErrors?.participantId}
            >
              <SelectValue placeholder="Pick a participant" />
            </BrandedSelectTrigger>
            <SelectContent>
              {participants.map((p) => (
                <BrandedSelectItem key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </BrandedSelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.fieldErrors?.participantId && (
            <p className="text-xs text-destructive">
              {state.fieldErrors.participantId}
            </p>
          )}
        </div>
      )}
      {defaultParticipantId && (
        <input type="hidden" name="participantId" value={defaultParticipantId} />
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="comm-direction">Direction</Label>
          <Select
            name="direction"
            value={direction}
            onValueChange={(v) => v && setDirection(v as Direction)}
          >
            <BrandedSelectTrigger id="comm-direction" className="w-full">
              <SelectValue />
            </BrandedSelectTrigger>
            <SelectContent>
              {DIRECTIONS.map((d) => (
                <BrandedSelectItem key={d.value} value={d.value}>
                  {d.label}
                </BrandedSelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="comm-channel">Channel</Label>
          <Select
            name="channel"
            value={channel}
            onValueChange={(v) => v && setChannel(v as Channel)}
          >
            <BrandedSelectTrigger id="comm-channel" className="w-full">
              <SelectValue />
            </BrandedSelectTrigger>
            <SelectContent>
              {CHANNELS.map((c) => (
                <BrandedSelectItem key={c.value} value={c.value}>
                  {c.label}
                </BrandedSelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="comm-when">When</Label>
          <Input
            id="comm-when"
            name="occurredAt"
            type="datetime-local"
            defaultValue={initialDateTime}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comm-with">
          With<span className="ml-0.5 text-destructive">*</span>
        </Label>
        <Input
          id="comm-with"
          name="withParty"
          placeholder="E.g. Sarah's mum, OT Jenny, Acme rostering manager"
          required
          aria-invalid={!!state.fieldErrors?.withParty}
        />
        {state.fieldErrors?.withParty && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.withParty}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="comm-summary">
          Summary<span className="ml-0.5 text-destructive">*</span>
        </Label>
        <Textarea
          id="comm-summary"
          name="summary"
          rows={2}
          placeholder="What was discussed."
          required
          aria-invalid={!!state.fieldErrors?.summary}
        />
        {state.fieldErrors?.summary && (
          <p className="text-xs text-destructive">{state.fieldErrors.summary}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="comm-followup">Follow-up needed</Label>
        <Textarea
          id="comm-followup"
          name="followUp"
          rows={2}
          placeholder="What you need to do next, by when."
        />
      </div>

      <FormError message={state.error} />

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Log communication"}
        </Button>
      </div>
    </form>
  );
}