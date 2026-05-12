"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertTriangle, FileUp, Sparkles } from "lucide-react";

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
import { FormError } from "@/components/form-error";

import { PlanForm } from "../new/plan-form";
import {
  extractPlanFromUploadAction,
  type ExtractPlanState,
} from "./actions";

const initial: ExtractPlanState = {};

const CONFIDENCE_VARIANT: Record<
  "high" | "medium" | "low",
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  high: { label: "high confidence", variant: "secondary" },
  medium: { label: "medium confidence", variant: "outline" },
  low: { label: "low confidence — review carefully", variant: "destructive" },
};

export function ImportPlanFlow({
  participantId,
  cancelHref,
}: {
  participantId: string;
  cancelHref: string;
}) {
  const [state, dispatch, pending] = useActionState(
    extractPlanFromUploadAction.bind(null, participantId),
    initial
  );

  if (state.ok && state.extracted) {
    const conf = CONFIDENCE_VARIANT[state.extracted.confidence];
    return (
      <div className="space-y-4">
        <Alert>
          <Sparkles />
          <AlertTitle className="flex items-center gap-2">
            Extracted from {state.fileName ?? "your upload"}
            <Badge variant={conf.variant} className="text-[10px]">
              {conf.label}
            </Badge>
            {state.source === "mock" && (
              <Badge variant="outline" className="text-[10px]">
                placeholder data
              </Badge>
            )}
          </AlertTitle>
          <AlertDescription className="space-y-1">
            <p className="text-xs">
              Review each field below before saving. The PDF is attached to
              the plan automatically.
            </p>
            {state.extracted.notes && (
              <p className="text-xs italic text-muted-foreground">
                {state.extracted.notes}
              </p>
            )}
            {state.source === "mock" && (
              <p className="text-xs text-muted-foreground">
                No ANTHROPIC_API_KEY set on the server — the values shown are
                placeholders so you can verify the flow. Set the env var to
                run real extraction.
              </p>
            )}
          </AlertDescription>
        </Alert>

        <PlanForm
          participantId={participantId}
          cancelHref={cancelHref}
          prefill={state.extracted}
          planFileKey={state.fileKey ?? null}
          planFileName={state.fileName ?? null}
        />
      </div>
    );
  }

  return (
    <form action={dispatch}>
      <Card>
        <CardHeader>
          <CardTitle>Upload the plan PDF</CardTitle>
          <CardDescription>
            We&apos;ll read the dates and bucket totals out of the document.
            You confirm everything on the next screen — nothing is saved until
            you do.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="planPdf">Plan PDF</Label>
            <Input
              id="planPdf"
              name="planPdf"
              type="file"
              accept="application/pdf,.pdf"
              required
            />
            <p className="text-xs text-muted-foreground">
              PDF only. Max 10 MB.
            </p>
          </div>

          {state.error && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <FormError message={state.error} />

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" render={<Link href={cancelHref} />}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              <FileUp />
              {pending ? "Reading PDF…" : "Read PDF"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}