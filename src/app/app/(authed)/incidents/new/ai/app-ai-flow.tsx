"use client";

import { useActionState, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormError } from "@/components/form-error";
import { cn } from "@/lib/utils";

import {
  createAppAIIncident,
  type AppIncidentState,
} from "../actions";
import { appExtractIncidentAction, type AppExtractState } from "./actions";

const initialExtract: AppExtractState = {};
const initialSubmit: AppIncidentState = {};

const TYPES = [
  { value: "INJURY", label: "Injury" },
  { value: "ABUSE", label: "Abuse" },
  { value: "NEGLECT", label: "Neglect" },
  { value: "UNLAWFUL_CONTACT", label: "Unlawful contact" },
  { value: "UNAUTHORISED_RESTRICTIVE_PRACTICE", label: "Restrictive practice" },
  { value: "PROPERTY_DAMAGE", label: "Property damage" },
  { value: "MEDICATION_ERROR", label: "Medication error" },
  { value: "MISSING_PERSON", label: "Missing person" },
  { value: "DEATH", label: "Death" },
  { value: "OTHER", label: "Other" },
] as const;
const SEVERITIES = [
  { value: "MINOR", label: "Minor" },
  { value: "MODERATE", label: "Moderate" },
  { value: "SERIOUS", label: "Serious" },
  { value: "REPORTABLE", label: "Reportable" },
] as const;
const CONFIDENCE: Record<
  "high" | "medium" | "low",
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  high: { label: "high", variant: "secondary" },
  medium: { label: "medium", variant: "outline" },
  low: { label: "low — review carefully", variant: "destructive" },
};

function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AppAIFlow({
  participants,
}: {
  participants: { id: string; name: string }[];
}) {
  const [extractState, extractDispatch, extracting] = useActionState(
    appExtractIncidentAction,
    initialExtract
  );
  const [submitState, submitDispatch, submitting] = useActionState(
    createAppAIIncident,
    initialSubmit
  );

  return (
    <>
      <StepDots step={extractState.ok ? 2 : 1} />
      {!extractState.ok ? (
        <ExtractStep
          state={extractState}
          dispatch={extractDispatch}
          extracting={extracting}
          participants={participants}
        />
      ) : (
        <ReviewStep
          extracted={extractState}
          submitState={submitState}
          submitDispatch={submitDispatch}
          submitting={submitting}
          participants={participants}
        />
      )}
    </>
  );
}

function StepDots({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className={cn("font-medium", step === 1 && "text-foreground")}>
        1 · Describe
      </span>
      <span>→</span>
      <span className={cn("font-medium", step === 2 && "text-foreground")}>
        2 · Review &amp; submit
      </span>
    </div>
  );
}

function ExtractStep({
  state,
  dispatch,
  extracting,
  participants,
}: {
  state: AppExtractState;
  dispatch: (fd: FormData) => void;
  extracting: boolean;
  participants: { id: string; name: string }[];
}) {
  const [participantId, setParticipantId] = useState("");
  const [narrative, setNarrative] = useState("");

  return (
    <form action={dispatch}>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">AI-Powered Incident Report</p>
              <p className="text-xs text-white/80">
                We&apos;ll extract NDIS-compliant fields from your words
              </p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-2">
            <Label htmlFor="participantId">Participant (optional)</Label>
            <Select
              name="participantId"
              value={participantId}
              onValueChange={(v) => setParticipantId(v ?? "")}
            >
              <SelectTrigger id="participantId" className="w-full">
                <SelectValue placeholder="Select participant">
                  {participants.find((p) => p.id === participantId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="narrative">
                Incident narrative <span className="text-destructive">*</span>
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {narrative.length} chars
              </span>
            </div>
            <Textarea
              id="narrative"
              name="narrative"
              rows={6}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Describe what happened — who, what, when, where, and actions taken."
              aria-invalid={!!state.fieldErrors?.narrative}
            />
            {state.fieldErrors?.narrative && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.narrative}
              </p>
            )}
          </div>

          <FormError message={state.error} />

          <Button
            type="submit"
            disabled={extracting}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
            size="lg"
          >
            <Wand2 />
            {extracting ? "Analysing…" : "Generate compliant report"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function ReviewStep({
  extracted,
  submitState,
  submitDispatch,
  submitting,
  participants,
}: {
  extracted: AppExtractState;
  submitState: AppIncidentState;
  submitDispatch: (fd: FormData) => void;
  submitting: boolean;
  participants: { id: string; name: string }[];
}) {
  const data = extracted.extracted!;
  const conf = CONFIDENCE[data.confidence];
  const [participantId, setParticipantId] = useState(
    extracted.participantId ?? ""
  );
  const [incidentType, setIncidentType] = useState(data.incidentType ?? "");
  const [severity, setSeverity] = useState(data.severity ?? "");

  return (
    <form action={submitDispatch} className="space-y-4">
      <input
        type="hidden"
        name="narrativeInput"
        value={extracted.narrative ?? ""}
      />

      <Alert>
        <Sparkles />
        <AlertTitle className="flex flex-wrap items-center gap-2">
          Extracted
          <Badge variant={conf.variant} className="text-[10px]">
            {conf.label}
          </Badge>
          {extracted.source === "mock" && (
            <Badge variant="outline" className="text-[10px]">
              placeholder
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription className="text-xs">
          {data.notes ?? "Review each field before submitting."}
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="r-pid">Participant (optional)</Label>
            <Select
              name="participantId"
              value={participantId}
              onValueChange={(v) => setParticipantId(v ?? "")}
            >
              <SelectTrigger id="r-pid" className="w-full">
                <SelectValue placeholder="Select participant">
                  {participants.find((p) => p.id === participantId)?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-when">Date &amp; time</Label>
            <Input
              id="r-when"
              name="occurredAt"
              type="datetime-local"
              defaultValue={data.occurredAt ?? nowLocalIso()}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-loc">Location</Label>
            <Input id="r-loc" name="location" defaultValue={data.location ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-type">Incident type</Label>
            <Select
              name="incidentType"
              value={incidentType}
              onValueChange={(v) => setIncidentType(v ?? "")}
            >
              <SelectTrigger id="r-type" className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-sev">
              Severity <span className="text-destructive">*</span>
            </Label>
            <Select
              name="severity"
              value={severity}
              onValueChange={(v) => setSeverity(v ?? "")}
            >
              <SelectTrigger id="r-sev" className="w-full">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-desc">Description</Label>
            <Textarea
              id="r-desc"
              name="description"
              rows={5}
              defaultValue={data.description}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="r-imm">Immediate actions</Label>
            <Textarea
              id="r-imm"
              name="immediateActions"
              rows={3}
              defaultValue={data.immediateActions ?? ""}
            />
          </div>

          <FormError message={submitState.error} />

          <Button
            type="submit"
            disabled={submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? "Submitting…" : "Submit Incident Report"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}