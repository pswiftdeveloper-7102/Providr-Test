import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  startOfWeek,
} from "date-fns";

// Week math centralised here so the roster, future shift screens, and
// rostering jobs all agree on a Monday–Sunday week.

export type WeekRange = {
  start: Date; // Monday 00:00 local
  end: Date;   // Sunday 23:59 local
  days: Date[]; // 7 dates from Mon to Sun, each at 00:00 local
};

export function getWeekRange(refDate: Date): WeekRange {
  const start = startOfWeek(refDate, { weekStartsOn: 1 });
  const end = endOfWeek(refDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return { start, end, days };
}

export function formatWeekRange(week: WeekRange): string {
  // e.g. "5 May – 11 May 2026"
  const sameYear =
    week.start.getFullYear() === week.end.getFullYear();
  if (sameYear) {
    return `${format(week.start, "d MMM")} – ${format(week.end, "d MMM yyyy")}`;
  }
  return `${format(week.start, "d MMM yyyy")} – ${format(week.end, "d MMM yyyy")}`;
}

export function shiftWeek(refDate: Date, delta: number): Date {
  return addWeeks(refDate, delta);
}

export function toWeekParam(date: Date): string {
  // ISO date (no time) — safer for URL round-tripping than full ISO.
  return format(date, "yyyy-MM-dd");
}

export function parseWeekParam(weekParam: string | undefined | null): Date {
  if (!weekParam) return new Date();
  const parsed = new Date(weekParam);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}