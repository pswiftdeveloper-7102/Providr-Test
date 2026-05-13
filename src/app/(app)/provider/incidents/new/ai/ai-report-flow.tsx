"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  createAIIncidentAction,
  type CreateIncidentState,
} from "../../actions";
import {
  extractIncidentAction,
  type ExtractIncidentState,
} from "./actions";

const initialExtract: ExtractIncidentState = {};
const initialSubmit: CreateIncidentState = {};

const TYPES = [
  { value: "INJURY", label: "Injury" },
  { value: "ABUSE", label: "Abuse" },
  { value: "NEGLECT", label: "Neglect" },
  { value: "UNLAWFUL_CONTACT", label: "Unlawful contact" },
  { value: "UNAUTHORISED_RESTRICTIVE_PRACTICE", label: "Unauthorised restrictive practice" },
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
  high: { label: "high confidence", variant: "secondary" },
  medium: { label: "medium confidence", variant: "outline" },
  low: { label: "low confidence — review carefully", variant: "destructive" },
};

function nowLocalIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Participant = { id: string; name: string };

export function AIReportFlow({ participants }: { participants: Participant[] }) {
  const [extractState, extractDispatch, extracting] = useActionState(
    extractIncidentAction,
    initialExtract
  );
  const [submitState, submitDispatch, submitting] = useActionState(
    createAIIncidentAction,
    initialSubmit
  );

  return (
    <>
      <StepIndicator step={extractState.ok ? 2 : 1} />

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

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <ol className="flex items-center gap-4">
      <li className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
            step >= 1
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          1
        </div>
        <div className="text-sm">
          <p className={cn("font-medium", step === 1 && "text-foreground")}>
            Step 1 of 2
          </p>
          <p className="text-xs text-muted-foreground">Describe the incident</p>
        </div>
      </li>
      <div className="h-px flex-1 bg-border" />
      <li className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
            step >= 2
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          2
        </div>
        <div className="text-sm">
          <p className={cn("font-medium", step === 2 && "text-foreground")}>
            Review &amp; Submit
          </p>
        </div>
      </li>
    </ol>
  );
}

function ExtractStep({
  state,
  dispatch,
  extracting,
  participants,
}: {
  state: ExtractIncidentState;
  dispatch: (fd: FormData) => void;
  extracting: boolean;
  participants: Participant[];
}) {
  const [participantId, setParticipantId] = useState("");
  const [narrative, setNarrative] = useState("");

  return (
    <form action={dispatch}>
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">AI-Powered Incident Report</p>
              <p className="text-xs text-white/80">
                Describe the incident and our AI will generate an NDIS-compliant report
              </p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="participantId">Participant (optional)</Label>
            <Select
              name="participantId"
              value={participantId}
              onValueChange={(v) => setParticipantId(v ?? "")}
            >
              <SelectTrigger id="participantId" className="w-full">
                <SelectValue placeholder="Select a participant…">
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
                Incident Narrative <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {narrative.length} chars
              </span>
            </div>
            <Textarea
              id="narrative"
              name="narrative"
              rows={6}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Describe what happened in detail. Include who was involved, what occurred, when and where it happened, and any actions taken. The AI will extract structured NDIS-compliant fields from your description…"
              aria-invalid={!!state.fieldErrors?.narrative}
            />
            {state.fieldErrors?.narrative && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.narrative}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Write a detailed description — the AI will classify the incident, assess severity, and generate a report.
            </p>
          </div>

          <FormError message={state.error} />

          <Button
            type="submit"
            disabled={extracting}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
            size="lg"
          >
            <Wand2 />
            {extracting ? "Analysing…" : "Generate Compliant Report"}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              size="sm"
              render={<Link href="/provider/incidents/new/wizard" />}
            >
              Fill in manually instead
            </Button>
          </div>
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
  extracted: ExtractIncidentState;
  submitState: CreateIncidentState;
  submitDispatch: (fd: FormData) => void;
  submitting: boolean;
  participants: Participant[];
}) {
  const data = extracted.extracted!;
  const conf = CONFIDENCE[data.confidence];

  const [participantId, setParticipantId] = useState(
    extracted.participantId ?? ""
  );
  const [incidentType, setIncidentType] = useState<string>(
    data.incidentType ?? ""
  );
  const [severity, setSeverity] = useState<string>(data.severity ?? "");

  return (
    <form action={submitDispatch} className="space-y-4">
      <input type="hidden" name="narrativeInput" value={extracted.narrative ?? ""} />

      <Alert>
        <Sparkles />
        <AlertTitle className="flex items-center gap-2">
          Extracted from your narrative
          <Badge variant={conf.variant} className="text-[10px]">
            {conf.label}
          </Badge>
          {extracted.source === "mock" && (
            <Badge variant="outline" className="text-[10px]">
              placeholder data
            </Badge>
          )}
        </AlertTitle>
        <AlertDescription className="space-y-1 text-xs">
          <p>Review each field below before submitting.</p>
          {data.notes && (
            <p className="italic text-muted-foreground">{data.notes}</p>
          )}
          {extracted.source === "mock" && (
            <p className="text-muted-foreground">
              Set ANTHROPIC_API_KEY on the server to run real extraction.
            </p>
          )}
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Review &amp; Submit</CardTitle>
          <CardDescription>
            All fields are editable. Nothing is saved until you submit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="participantId">Participant (optional)</Label>
            <Select
              name="participantId"
              value={participantId}
              onValueChange={(v) => setParticipantId(v ?? "")}
            >
              <SelectTrigger id="participantId" className="w-full">
                <SelectValue placeholder="Select a participant…">
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
            <Label htmlFor="occurredAt">Date &amp; Time</Label>
            <Input
              id="occurredAt"
              name="occurredAt"
              type="datetime-local"
              defaultValue={data.occurredAt ?? nowLocalIso()}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              name="location"
              defaultValue={data.location ?? ""}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="incidentType">Incident Type</Label>
              <Select
                name="incidentType"
                value={incidentType}
                onValueChange={(v) => setIncidentType(v ?? "")}
              >
                <SelectTrigger id="incidentType" className="w-full">
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
              <Label htmlFor="severity">
                Severity <span className="text-destructive">*</span>
              </Label>
              <Select
                name="severity"
                value={severity}
                onValueChange={(v) => setSeverity(v ?? "")}
              >
                <SelectTrigger id="severity" className="w-full">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={data.description}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="immediateActions">Immediate actions</Label>
            <Textarea
              id="immediateActions"
              name="immediateActions"
              rows={3}
              defaultValue={data.immediateActions ?? ""}
            />
          </div>

          <FormError message={submitState.error} />

          <Button type="submit" disabled={submitting} className="w-full" size="lg">
            {submitting ? "Submitting…" : "Submit Incident Report"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}