"use client";

import { useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { markReportedToNdisAction } from "../actions";

type Props = {
  incidentId: string;
  reportedToNdisAt: Date | null;
};

export function NdisSubmissionControls({
  incidentId,
  reportedToNdisAt,
}: Props) {
  const [pending, startTransition] = useTransition();

  const onMark = () => {
    startTransition(async () => {
      await markReportedToNdisAction(incidentId);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>NDIS submission</CardTitle>
        <CardDescription>
          Track when you submitted the formal notification to the NDIS
          Quality and Safeguards Commission.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reportedToNdisAt ? (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>
              Marked as submitted on{" "}
              <strong>
                {format(reportedToNdisAt, "EEE d MMM yyyy 'at' h:mm a")}
              </strong>
              .
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Click once you&apos;ve filed the formal notification on the NDIS
              portal.
            </p>
            <Button onClick={onMark} disabled={pending}>
              <Send />
              {pending ? "Marking…" : "Mark submitted to NDIS"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}