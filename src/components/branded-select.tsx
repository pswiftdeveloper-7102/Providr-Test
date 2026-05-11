"use client";

import * as React from "react";

import {
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Auth/brand-themed wrappers around shadcn Select primitives. Purple focus
 * ring, lavender input background, and a violet highlight in the dropdown
 * list — matches the auth-page screenshot. Use these only inside auth pages;
 * the rest of the app sticks with the default neutral palette.
 */

type TriggerProps = React.ComponentProps<typeof SelectTrigger>;

export function BrandedSelectTrigger({ className, ...props }: TriggerProps) {
  return (
    <SelectTrigger
      {...props}
      className={cn(
        // Background + border match the lavender input fields
        "bg-violet-50/60 border-violet-200",
        // Hover lifts the lavender a touch
        "hover:bg-violet-100/60",
        // Focus ring switches to brand purple
        "focus-visible:border-violet-500 focus-visible:ring-violet-500/30",
        // Make the trigger a touch taller and full-width when stretched
        "h-10",
        className
      )}
    />
  );
}

type ItemProps = React.ComponentProps<typeof SelectItem>;

export function BrandedSelectItem({ className, ...props }: ItemProps) {
  return (
    <SelectItem
      {...props}
      className={cn(
        // Highlight + selection states in brand purple
        "focus:bg-violet-100 focus:text-violet-900",
        "data-[selected=true]:bg-violet-50 data-[selected=true]:text-violet-900",
        // Bigger touch target inside dropdowns
        "py-2",
        className
      )}
    />
  );
}