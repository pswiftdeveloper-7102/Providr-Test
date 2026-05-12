import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { format, isToday, isSameDay } from "date-fns";

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
import { cn } from "@/lib/utils";
import {
  formatWeekRange,
  getWeekRange,
  parseWeekParam,
  shiftWeek,
  toWeekParam,
} from "@/lib/week";

type SearchParams = Promise<{ week?: string }>;

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

export default async function RosterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const context = await resolvePortalContext("provider");

  const ref = parseWeekParam(sp.week);
  const week = getWeekRange(ref);

  const shifts = await db.shift.findMany({
    where: {
      orgId: context.activeOrg.id,
      scheduledStart: { gte: week.start, lte: week.end },
    },
    include: {
      participant: { select: { firstName: true, lastName: true } },
      worker: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const prevHref = `/provider/roster?week=${toWeekParam(shiftWeek(ref, -1))}`;
  const nextHref = `/provider/roster?week=${toWeekParam(shiftWeek(ref, +1))}`;
  const todayHref = `/provider/roster`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Roster</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Who&apos;s on with whom this week.
          </p>
        </div>
        <Button render={<Link href="/provider/roster/new" />}>
          <Plus />
          New shift
        </Button>
      </header>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{formatWeekRange(week)}</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous week"
                render={<Link href={prevHref} />}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={todayHref} />}
              >
                This week
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next week"
                render={<Link href={nextHref} />}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <CardDescription>
            {shifts.length === 0
              ? "Nothing scheduled this week yet."
              : `${shifts.length} shift${shifts.length === 1 ? "" : "s"} scheduled.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          {week.days.map((day) => {
            const dayShifts = shifts.filter((s) =>
              isSameDay(s.scheduledStart, day)
            );
            const isCurrent = isToday(day);
            return (
              <div key={day.toISOString()} className="py-4 first:pt-2 last:pb-2">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-2">
                    <h3
                      className={cn(
                        "text-sm font-semibold",
                        isCurrent && "text-primary"
                      )}
                    >
                      {format(day, "EEE, dd/MM")}
                    </h3>
                    {isCurrent && (
                      <span className="text-xs text-primary">Today</span>
                    )}
                  </div>
                  {dayShifts.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      No shifts
                    </span>
                  )}
                </div>
                {dayShifts.length > 0 && (
                  <ul className="mt-2 space-y-2">
                    {dayShifts.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/provider/shifts/${s.id}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 transition-colors hover:bg-muted/60"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium">
                              {s.worker.firstName} {s.worker.lastName}
                              <span className="mx-1.5 text-muted-foreground">
                                →
                              </span>
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
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}