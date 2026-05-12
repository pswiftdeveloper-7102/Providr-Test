"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { enAU } from "date-fns/locale";

import { cn } from "@/lib/utils";

/**
 * shadcn-style Calendar wrapping react-day-picker v10. Locale forced
 * to en-AU so weekday names and "today" labels match the rest of the
 * Australian-locale platform. The default react-day-picker stylesheet
 * is imported once here and tuned via CSS variables in globals.css.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      locale={enAU}
      showOutsideDays={showOutsideDays}
      className={cn("rdp-providr p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-3",
        month_caption: "flex items-center justify-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-1 top-1 size-7 rounded-md border border-input bg-transparent p-0 opacity-60 hover:opacity-100 hover:bg-muted inline-flex items-center justify-center"
        ),
        button_next: cn(
          "absolute right-1 top-1 size-7 rounded-md border border-input bg-transparent p-0 opacity-60 hover:opacity-100 hover:bg-muted inline-flex items-center justify-center"
        ),
        weekdays: "flex",
        weekday:
          "text-muted-foreground w-9 text-[0.7rem] font-normal text-center",
        week: "flex w-full mt-1",
        day: "size-9 text-center text-sm p-0 relative",
        day_button:
          "inline-flex size-9 items-center justify-center rounded-md text-sm font-normal hover:bg-muted",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "[&>button]:text-muted-foreground/50",
        disabled: "[&>button]:text-muted-foreground/40 [&>button]:cursor-not-allowed",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevClass }) => {
          const Icon = orientation === "right" ? ChevronRight : ChevronLeft;
          return <Icon className={cn("size-4", chevClass)} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };