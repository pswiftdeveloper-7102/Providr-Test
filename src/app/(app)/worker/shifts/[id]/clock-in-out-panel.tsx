"use client";

import { useActionState, useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, MapPin, Play, Square } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  clockInAction,
  clockOutAction,
  type ClockState,
} from "./actions";

type Props = {
  shiftId: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  actualStart: Date | null;
  actualEnd: Date | null;
};

type GeoState =
  | { state: "idle" }
  | { state: "locating" }
  | { state: "ready"; lat: number; lng: number; accuracyM: number }
  | { state: "denied" }
  | { state: "unsupported" }
  | { state: "error"; message: string };

const initial: ClockState = {};

export function ClockInOutPanel({
  shiftId,
  status,
  actualStart,
  actualEnd,
}: Props) {
  const [clockInState, clockInDispatch, clockInPending] = useActionState(
    clockInAction.bind(null, shiftId),
    initial
  );
  const [clockOutState, clockOutDispatch, clockOutPending] = useActionState(
    clockOutAction.bind(null, shiftId),
    initial
  );

  const [geo, setGeo] = useState<GeoState>({ state: "idle" });

  const captureLocation = () =>
    new Promise<void>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setGeo({ state: "unsupported" });
        resolve();
        return;
      }
      setGeo({ state: "locating" });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeo({
            state: "ready",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: pos.coords.accuracy,
          });
          resolve();
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGeo({ state: "denied" });
          } else {
            setGeo({ state: "error", message: err.message });
          }
          resolve();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
      );
    });

  if (status === "COMPLETED") {
    return (
      <Card>
        <CardContent className="flex items-start gap-3 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div className="text-sm">
            <p className="font-medium">Shift complete</p>
            {actualStart && actualEnd && (
              <p className="text-xs text-muted-foreground">
                Clocked in {format(actualStart, "h:mm a")} · out{" "}
                {format(actualEnd, "h:mm a")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "CANCELLED") {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-muted-foreground">
          This shift was cancelled.
        </CardContent>
      </Card>
    );
  }

  const isInProgress = status === "IN_PROGRESS";
  const formError = isInProgress ? clockOutState.error : clockInState.error;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {isInProgress && actualStart && (
          <p className="text-xs text-muted-foreground">
            Clocked in at {format(actualStart, "h:mm a")} ·{" "}
            {format(actualStart, "dd MMM")}
          </p>
        )}

        <form
          action={(fd) => {
            if (geo.state === "ready") {
              fd.set("lat", String(geo.lat));
              fd.set("lng", String(geo.lng));
              fd.set("accuracyM", String(geo.accuracyM));
            }
            if (isInProgress) {
              clockOutDispatch(fd);
            } else {
              clockInDispatch(fd);
            }
          }}
          className="space-y-3"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={captureLocation}
            disabled={geo.state === "locating"}
            className="w-full"
          >
            <MapPin />
            {geo.state === "locating"
              ? "Getting location…"
              : geo.state === "ready"
              ? `Location captured (±${Math.round(geo.accuracyM)} m)`
              : "Use my current location"}
          </Button>

          {geo.state === "denied" && (
            <Alert>
              <AlertDescription className="text-xs">
                Location permission denied. You can still clock in — the
                shift will be logged without a location.
              </AlertDescription>
            </Alert>
          )}
          {geo.state === "unsupported" && (
            <Alert>
              <AlertDescription className="text-xs">
                This device doesn&apos;t support location capture.
              </AlertDescription>
            </Alert>
          )}
          {geo.state === "error" && (
            <Alert>
              <AlertDescription className="text-xs">
                Couldn&apos;t capture location: {geo.message}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            size="lg"
            variant={isInProgress ? "destructive" : "default"}
            disabled={clockInPending || clockOutPending}
            className="w-full"
          >
            {isInProgress ? <Square /> : <Play />}
            {isInProgress
              ? clockOutPending
                ? "Clocking out…"
                : "Clock out"
              : clockInPending
              ? "Clocking in…"
              : "Clock in"}
          </Button>

          {formError && (
            <p className="text-center text-xs text-destructive">{formError}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}