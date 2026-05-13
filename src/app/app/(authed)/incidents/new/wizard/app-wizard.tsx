"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertTriangle, ArrowLeft, Check } from "lucide-react";

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  createAppWizardIncident,
  type AppIncidentState,
} from "../actions";

const initial: AppIncidentState = {};

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

const STEPS = [
  "Classification",
  "What happened",
  "Response",
  "Medical",
  "Restrictive",
  "Declaration",
] as const;

function nowDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type State = {
  participantId: string;
  date: string;
  time: string;
  location: string;
  incidentType: string;
  severity: string;
  description: string;
  immediateActions: string;
  witnessNames: string;
  medicalAttention: "yes" | "no" | "";
  medicalNotes: string;
  restrictivePractice: "yes" | "no" | "";
  restrictiveNotes: string;
  declarationName: string;
};

const initialForm: State = {
  participantId: "",
  date: nowDate(),
  time: nowTime(),
  location: "",
  incidentType: "",
  severity: "",
  description: "",
  immediateActions: "",
  witnessNames: "",
  medicalAttention: "",
  medicalNotes: "",
  restrictivePractice: "",
  restrictiveNotes: "",
  declarationName: "",
};

export function AppWizard({
  participants,
}: {
  participants: { id: string; name: string }[];
}) {
  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState<State>(initialForm);
  const [submitState, submitDispatch, submitting] = useActionState(
    createAppWizardIncident,
    initial
  );

  const set = <K extends keyof State>(key: K, value: State[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canAdvance = (): boolean => {
    if (step === 1) {
      return !!(
        form.date &&
        form.time &&
        form.location &&
        form.incidentType &&
        form.severity
      );
    }
    if (step === 2) return form.description.trim().length >= 10;
    if (step === 4) {
      return (
        form.medicalAttention !== "" &&
        (form.medicalAttention === "no" ||
          (form.medicalAttention === "yes" &&
            form.medicalNotes.trim().length >= 5))
      );
    }
    if (step === 5) {
      return (
        form.restrictivePractice !== "" &&
        (form.restrictivePractice === "no" ||
          (form.restrictivePractice === "yes" &&
            form.restrictiveNotes.trim().length >= 5))
      );
    }
    return true;
  };

  const onSubmit = (fd: FormData) => {
    const occurredAt = `${form.date}T${form.time}`;
    fd.set("participantId", form.participantId);
    fd.set("occurredAt", occurredAt);
    fd.set("location", form.location);
    fd.set("incidentType", form.incidentType);
    fd.set("severity", form.severity);
    fd.set("description", form.description);
    fd.set("immediateActions", form.immediateActions);
    fd.set("witnessNames", form.witnessNames);
    fd.set("medicalAttention", form.medicalAttention);
    fd.set("medicalNotes", form.medicalNotes);
    fd.set("restrictivePractice", form.restrictivePractice);
    fd.set("restrictiveNotes", form.restrictiveNotes);
    fd.set("declarationName", form.declarationName);
    submitDispatch(fd);
  };

  return (
    <div className="space-y-5">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/app/incidents/new" />}
      >
        <ArrowLeft />
        Change type
      </Button>

      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Compliance Wizard
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Step {step} of {STEPS.length} — {STEPS[step - 1]}
          </p>
        </div>
      </header>

      <ol className="grid grid-cols-6 gap-1">
        {STEPS.map((_, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li
              key={n}
              className={cn(
                "h-1.5 rounded-full",
                active && "bg-primary",
                done && "bg-emerald-500",
                !active && !done && "bg-muted"
              )}
            />
          );
        })}
      </ol>

      <form action={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step - 1]}</CardTitle>
            <CardDescription>
              {step === 1 && "Identify when, where, type and severity."}
              {step === 2 && "Describe what happened and any witnesses."}
              {step === 3 && "What did the worker do at the time?"}
              {step === 4 && "Did the participant need medical attention?"}
              {step === 5 && "Was a restrictive practice used?"}
              {step === 6 && "Confirm with your full name."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <Step1 participants={participants} form={form} set={set} />
            )}
            {step === 2 && <Step2 form={form} set={set} />}
            {step === 3 && <Step3 form={form} set={set} />}
            {step === 4 && <Step4 form={form} set={set} />}
            {step === 5 && <Step5 form={form} set={set} />}
            {step === 6 && <Step6 form={form} set={set} />}

            <FormError message={submitState.error} />

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={step === 1}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
              {step < STEPS.length ? (
                <Button
                  type="button"
                  disabled={!canAdvance()}
                  onClick={() => setStep(step + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitting || !form.declarationName.trim()}
                >
                  <Check />
                  {submitting ? "Submitting…" : "Submit"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function Step1({
  participants,
  form,
  set,
}: {
  participants: { id: string; name: string }[];
  form: State;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="s1-p">Participant (optional)</Label>
        <Select
          value={form.participantId}
          onValueChange={(v) => set("participantId", v ?? "")}
        >
          <SelectTrigger id="s1-p" className="w-full">
            <SelectValue placeholder="Select participant">
              {participants.find((p) => p.id === form.participantId)?.name}
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="s1-d">Date *</Label>
          <Input
            id="s1-d"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            max={nowDate()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="s1-t">Time *</Label>
          <Input
            id="s1-t"
            type="time"
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="s1-l">Location *</Label>
        <Input
          id="s1-l"
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="e.g. Participant's home"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s1-tp">Incident type *</Label>
        <Select
          value={form.incidentType}
          onValueChange={(v) => set("incidentType", v ?? "")}
        >
          <SelectTrigger id="s1-tp" className="w-full">
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
        <Label htmlFor="s1-sv">Severity *</Label>
        <Select
          value={form.severity}
          onValueChange={(v) => set("severity", v ?? "")}
        >
          <SelectTrigger id="s1-sv" className="w-full">
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
    </>
  );
}

function Step2({
  form,
  set,
}: {
  form: State;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="s2-d">Description *</Label>
        <Textarea
          id="s2-d"
          rows={6}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What happened, in chronological order. Factual."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="s2-w">Witnesses</Label>
        <Input
          id="s2-w"
          value={form.witnessNames}
          onChange={(e) => set("witnessNames", e.target.value)}
          placeholder="Names of anyone who saw or heard"
        />
      </div>
    </>
  );
}

function Step3({
  form,
  set,
}: {
  form: State;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="s3-a">Immediate actions taken</Label>
      <Textarea
        id="s3-a"
        rows={5}
        value={form.immediateActions}
        onChange={(e) => set("immediateActions", e.target.value)}
        placeholder="e.g. Applied first aid, called supervisor…"
      />
    </div>
  );
}

function Step4({
  form,
  set,
}: {
  form: State;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Did the participant need medical attention? *</Label>
        <ToggleGroup
          value={form.medicalAttention ? [form.medicalAttention] : []}
          onValueChange={(vals) => {
            const v = vals[0];
            set(
              "medicalAttention",
              (v === "yes" || v === "no" ? v : "") as State["medicalAttention"]
            );
          }}
          variant="outline"
        >
          <ToggleGroupItem value="yes" className="flex-1">
            Yes
          </ToggleGroupItem>
          <ToggleGroupItem value="no" className="flex-1">
            No
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {form.medicalAttention === "yes" && (
        <div className="space-y-2">
          <Label htmlFor="s4-n">Medical notes</Label>
          <Textarea
            id="s4-n"
            rows={4}
            value={form.medicalNotes}
            onChange={(e) => set("medicalNotes", e.target.value)}
            placeholder="What treatment, by whom, follow-up needed."
          />
        </div>
      )}
    </>
  );
}

function Step5({
  form,
  set,
}: {
  form: State;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Was a restrictive practice used? *</Label>
        <ToggleGroup
          value={form.restrictivePractice ? [form.restrictivePractice] : []}
          onValueChange={(vals) => {
            const v = vals[0];
            set(
              "restrictivePractice",
              (v === "yes" || v === "no" ? v : "") as State["restrictivePractice"]
            );
          }}
          variant="outline"
        >
          <ToggleGroupItem value="yes" className="flex-1">
            Yes
          </ToggleGroupItem>
          <ToggleGroupItem value="no" className="flex-1">
            No
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {form.restrictivePractice === "yes" && (
        <div className="space-y-2">
          <Label htmlFor="s5-n">Describe the practice</Label>
          <Textarea
            id="s5-n"
            rows={4}
            value={form.restrictiveNotes}
            onChange={(e) => set("restrictiveNotes", e.target.value)}
            placeholder="What was used, for how long, who authorised it."
          />
          <p className="text-xs text-muted-foreground">
            Unauthorised use is itself a reportable incident under NDIS rules.
          </p>
        </div>
      )}
    </>
  );
}

function Step6({
  form,
  set,
}: {
  form: State;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
}) {
  return (
    <>
      <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
        <p className="font-medium">Declaration</p>
        <p className="mt-1 text-xs text-muted-foreground">
          I declare the information in this report is true and accurate to the
          best of my knowledge.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="s6-n">Your full name *</Label>
        <Input
          id="s6-n"
          value={form.declarationName}
          onChange={(e) => set("declarationName", e.target.value)}
          placeholder="e.g. Mateen Ahmed"
          required
        />
      </div>
    </>
  );
}