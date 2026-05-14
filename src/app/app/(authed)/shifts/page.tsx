import Link from "next/link";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { ChevronRight, Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolvePortalContext } from "@/lib/session";

function dayLabel(d: Date): string {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEEE dd MMM");
}

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  SCHEDULED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export default async function AppShiftsPage() {
  const context = await resolvePortalContext("provider");
  const session = await auth();
  const userId = session?.user?.id;
  const fromDay = startOfDay(new Date());

  // The PWA is the Worker App, so the shifts list is scoped to the
  // current user's linked Worker row. Managers without a Worker row
  // see an empty list — they should use the web portal for full
  // roster visibility.
  const worker = userId
    ? await db.worker.findFirst({
        where: { userId, orgId: context.activeOrg.id },
        select: { id: true },
      })
    : null;

  const shifts = worker
    ? await db.shift.findMany({
        where: {
          workerId: worker.id,
          scheduledEnd: { gte: fromDay },
          status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        },
        include: {
          participant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              address: true,
            },
          },
        },
        orderBy: { scheduledStart: "asc" },
        take: 30,
      })
    : [];

  // Group by day so the list reads like a calendar.
  const byDay = new Map<string, typeof shifts>();
  for (const s of shifts) {
    const key = format(startOfDay(s.scheduledStart), "yyyy-MM-dd");
    const arr = byDay.get(key) ?? [];
    arr.push(s);
    byDay.set(key, arr);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">
          Upcoming shifts
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Your roster — open a shift to view the care plan and write notes.
        </p>
      </header>

      {!worker ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No worker profile</CardTitle>
            <CardDescription>
              You&apos;re signed in as a manager. The shifts list is for
              support workers — head to the web portal at /provider/shifts
              for full roster visibility.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : shifts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nothing scheduled</CardTitle>
            <CardDescription>
              You don&apos;t have any upcoming shifts. New ones will appear
              here as your coordinator schedules them.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        Array.from(byDay.entries()).map(([key, dayShifts]) => (
          <section key={key} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dayLabel(dayShifts[0].scheduledStart)}
            </h2>
            <ul className="space-y-2">
              {dayShifts.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/app/shifts/${s.id}`}
                    className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-colors active:bg-muted"
                  >
                    <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={STATUS_VARIANT[s.status] ?? "outline"}
                          className="text-[10px]"
                        >
                          {s.status.toLowerCase().replace("_", " ")}
                        </Badge>
                        <span className="text-sm font-medium">
                          {s.participant.firstName} {s.participant.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {format(s.scheduledStart, "h:mm a")} —{" "}
                        {format(s.scheduledEnd, "h:mm a")}
                      </div>
                      {s.participant.address && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {s.participant.address}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}