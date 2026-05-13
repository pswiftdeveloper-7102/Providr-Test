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
  createWizardIncidentAction,
  type CreateIncidentState,
} from "../../actions";

const initial: CreateIncidentState = {};

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

const STEPS = [
  { key: 1, label: "Classification" },
  { key: 2, label: "What happened" },
  { key: 3, label: "Response" },
  { key: 4, label: "Medical" },
  { key: 5, label: "Restrictive practice" },
  { key: 6, label: "Declaration" },
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

type Participant = { id: string; name: string };
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

export function ComplianceWizard({ participants }: { participants: Participant[] }) {
  const [step, setStep] = useState<number>(1);
  const [form, setForm] = useState<State>(initialForm);
  const [submitState, submitDispatch, submitting] = useActionState(
    createWizardIncidentAction,
    initial
  );

  const set = <K extends keyof State>(key: K, value: State[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canAdvance = (): boolean => {
    if (step === 1) {
      return !!(form.date && form.time && form.location && form.incidentType && form.severity);
    }
    if (step === 2) {
      return form.description.trim().length >= 10;
    }
    if (step === 5) {
      // If restrictive practice was used, require a description.
      return (
        form.restrictivePractice !== "" &&
        (form.restrictivePractice === "no" ||
          (form.restrictivePractice === "yes" && form.restrictiveNotes.trim().length >= 5))
      );
    }
    if (step === 4) {
      return (
        form.medicalAttention !== "" &&
        (form.medicalAttention === "no" ||
          (form.medicalAttention === "yes" && form.medicalNotes.trim().length >= 5))
      );
    }
    return true;
  };

  const onSubmit = (fd: FormData) => {
    // Build a combined occurredAt for the server.
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
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/provider/incidents/new" />}
      >
        <ArrowLeft />
        Change report type
      </Button>

      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Compliance Wizard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Step-by-step guidance through every NDIS reporting requirement.
          </p>
        </div>
      </header>

      <StepBar step={step} />

      <form action={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Step {step}: {STEPS[step - 1].label}</CardTitle>
            <CardDescription>
              {step === 1 && "Identify the participant, when and where it happened, and the type and severity."}
              {step === 2 && "Describe what happened, who was involved, and any witnesses."}
              {step === 3 && "What did the worker do at the time? This becomes part of the record."}
              {step === 4 && "Did the participant need medical attention?"}
              {step === 5 && "Was a restrictive practice used? Any unauthorised use is itself a reportable incident."}
              {step === 6 && "Confirm everything is accurate. Your name and the timestamp are stored against the report."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <Step1
                participants={participants}
                form={form}
                set={set}
              />
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
              {step < 6 ? (
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
                  {submitting ? "Submitting…" : "Submit Report"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function StepBar({ step }: { step: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-3">
      {STEPS.map((s, i) => {
        const isActive = s.key === step;
        const isDone = s.key < step;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                isActive && "bg-primary text-primary-foreground",
                isDone && "bg-emerald-100 text-emerald-700",
                !isActive && !isDone && "bg-muted text-muted-foreground"
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : s.key}
            </div>
            <span
              className={cn(
                "text-xs",
                isActive ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="hidden h-px w-6 bg-border sm:inline-block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Step1({
  participants,
  form,
  set,
}: {
  participants: Participant[];
  form: State;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="participantId">Participant (optional)</Label>
        <Select
          value={form.participantId}
          onValueChange={(v) => set("participantId", v ?? "")}
        >
          <SelectTrigger id="participantId" className="w-full">
            <SelectValue placeholder="Select participant…">
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="w-date">Date <span className="text-destructive">*</span></Label>
          <Input
            id="w-date"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            max={nowDate()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="w-time">Time <span className="text-destructive">*</span></Label>
          <Input
            id="w-time"
            type="time"
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="w-loc">
          Location <span className="text-destructive">*</span>
        </Label>
        <Input
          id="w-loc"
          value={form.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder="e.g. Participant's home, day program centre"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="w-type">
            Incident Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.incidentType}
            onValueChange={(v) => set("incidentType", v ?? "")}
          >
            <SelectTrigger id="w-type" className="w-full">
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
          <Label htmlFor="w-sev">
            Severity <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.severity}
            onValueChange={(v) => set("severity", v ?? "")}
          >
            <SelectTrigger id="w-sev" className="w-full">
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
        <Label htmlFor="w-desc">
          What happened? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="w-desc"
          rows={6}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe in detail what happened, in chronological order. Focus on observable facts."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="w-witness">Witnesses (optional)</Label>
        <Input
          id="w-witness"
          value={form.witnessNames}
          onChange={(e) => set("witnessNames", e.target.value)}
          placeholder="Names of anyone who saw or heard the incident"
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
      <Label htmlFor="w-imm">Immediate actions taken</Label>
      <Textarea
        id="w-imm"
        rows={5}
        value={form.immediateActions}
        onChange={(e) => set("immediateActions", e.target.value)}
        placeholder="e.g. Applied first aid, called supervisor, notified family…"
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
        <Label>
          Did the participant require medical attention?{" "}
          <span className="text-destructive">*</span>
        </Label>
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
          <ToggleGroupItem value="yes" className="px-6">
            Yes
          </ToggleGroupItem>
          <ToggleGroupItem value="no" className="px-6">
            No
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {form.medicalAttention === "yes" && (
        <div className="space-y-2">
          <Label htmlFor="w-medn">Medical notes</Label>
          <Textarea
            id="w-medn"
            rows={4}
            value={form.medicalNotes}
            onChange={(e) => set("medicalNotes", e.target.value)}
            placeholder="What treatment was given, by whom, and any follow-up needed."
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
        <Label>
          Was a restrictive practice used during this incident?{" "}
          <span className="text-destructive">*</span>
        </Label>
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
          <ToggleGroupItem value="yes" className="px-6">
            Yes
          </ToggleGroupItem>
          <ToggleGroupItem value="no" className="px-6">
            No
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {form.restrictivePractice === "yes" && (
        <div className="space-y-2">
          <Label htmlFor="w-rpn">Describe the restrictive practice</Label>
          <Textarea
            id="w-rpn"
            rows={4}
            value={form.restrictiveNotes}
            onChange={(e) => set("restrictiveNotes", e.target.value)}
            placeholder="What was used, for how long, who authorised it, and the immediate post-incident debrief."
          />
          <p className="text-xs text-muted-foreground">
            Unauthorised use of a restrictive practice is itself a reportable
            incident under NDIS Commission rules.
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
          I declare the information provided in this report is true and accurate
          to the best of my knowledge. I understand that knowingly providing
          false information is a serious breach of the NDIS Code of Conduct.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="w-decl">
          Your full name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="w-decl"
          value={form.declarationName}
          onChange={(e) => set("declarationName", e.target.value)}
          placeholder="e.g. Mateen Ahmed"
          required
        />
      </div>
    </>
  );
}