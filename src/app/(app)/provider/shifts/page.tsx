import Link from "next/link";
import { format, isFuture, isToday, isYesterday } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

const STATUS_VARIANT: Record<
  "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
  "default" | "secondary" | "outline" | "destructive"
> = {
  SCHEDULED: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

function dayHeading(d: Date): string {
  if (isToday(d)) return `Today · ${format(d, "EEE, dd/MM")}`;
  if (isYesterday(d)) return `Yesterday · ${format(d, "EEE, dd/MM")}`;
  return format(d, "EEE, dd/MM/yyyy");
}

function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export default async function ShiftsListPage() {
  const context = await resolvePortalContext("provider");

  // Show recent + upcoming shifts. Older history is still queryable via
  // the participant or worker detail pages.
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const shifts = await db.shift.findMany({
    where: {
      orgId: context.activeOrg.id,
      scheduledStart: { gte: thirtyDaysAgo },
    },
    include: {
      participant: { select: { firstName: true, lastName: true } },
      worker: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledStart: "desc" },
  });

  // Group shifts by date for visual scanning.
  const upcoming = shifts
    .filter((s) => isFuture(s.scheduledStart) && !isToday(s.scheduledStart))
    .reverse();
  const today = shifts.filter((s) => isToday(s.scheduledStart));
  const past = shifts.filter(
    (s) => !isFuture(s.scheduledStart) && !isToday(s.scheduledStart)
  );

  const groups: Array<{ heading: string; shifts: typeof shifts }> = [];
  if (today.length) {
    groups.push({
      heading: dayHeading(today[0].scheduledStart),
      shifts: today,
    });
  }
  // Group upcoming by day
  const upcomingByDay = new Map<string, typeof shifts>();
  for (const s of upcoming) {
    const k = dateKey(s.scheduledStart);
    if (!upcomingByDay.has(k)) upcomingByDay.set(k, []);
    upcomingByDay.get(k)!.push(s);
  }
  for (const [, list] of upcomingByDay) {
    groups.push({
      heading: dayHeading(list[0].scheduledStart),
      shifts: list,
    });
  }
  // Past grouped by day
  const pastByDay = new Map<string, typeof shifts>();
  for (const s of past) {
    const k = dateKey(s.scheduledStart);
    if (!pastByDay.has(k)) pastByDay.set(k, []);
    pastByDay.get(k)!.push(s);
  }
  for (const [, list] of pastByDay) {
    groups.push({
      heading: dayHeading(list[0].scheduledStart),
      shifts: list,
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shifts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a shift to clock in/out, write notes, and log medication
            doses.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/provider/roster" />}
        >
          Open roster
        </Button>
      </header>

      {groups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No shifts in the last 30 days</CardTitle>
            <CardDescription>
              Schedule one from the roster to get started.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/provider/roster/new" />}>
              New shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <Card key={g.heading}>
              <CardHeader className="border-b">
                <CardTitle className="text-base">{g.heading}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y p-0">
                {g.shifts.map((s) => (
                  <Link
                    key={s.id}
                    href={`/provider/shifts/${s.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {s.worker.firstName} {s.worker.lastName}
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        {s.participant.firstName} {s.participant.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(s.scheduledStart, "h:mm a")} –{" "}
                        {format(s.scheduledEnd, "h:mm a")}
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[s.status]}>
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}