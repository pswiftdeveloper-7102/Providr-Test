"use client";

import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Drop-in replacement for `<Input type="date">`. Uses shadcn Calendar +
 * Popover so the displayed format is always dd/MM/yyyy regardless of
 * the browser locale.
 *
 * Submits a hidden input with `name` and value in `yyyy-MM-dd` format —
 * exactly what server actions and zod schemas already expect.
 */
export function DateField({
  name,
  label,
  required,
  defaultValue,
  max,
  min,
  error,
  helperText,
  placeholder = "dd/mm/yyyy",
}: {
  name: string;
  label?: string;
  required?: boolean;
  /** ISO yyyy-MM-dd (matches what `<input type="date">` accepts) */
  defaultValue?: string;
  /** ISO yyyy-MM-dd upper bound */
  max?: string;
  /** ISO yyyy-MM-dd lower bound */
  min?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;
}) {
  const initial = parseIsoDate(defaultValue);
  const [date, setDate] = React.useState<Date | undefined>(initial);
  const [open, setOpen] = React.useState(false);

  const isoValue = date ? format(date, "yyyy-MM-dd") : "";
  const displayValue = date ? format(date, "dd/MM/yyyy") : "";

  const minDate = parseIsoDate(min);
  const maxDate = parseIsoDate(max);

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={`${name}-trigger`}>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {/* The hidden input is what the form submits — server-side parsing
          is identical to the previous native <input type="date">. */}
      <input
        type="hidden"
        name={name}
        value={isoValue}
        required={required}
        aria-hidden
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={`${name}-trigger`}
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
              aria-invalid={!!error}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>{displayValue || placeholder}</span>
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setOpen(false);
            }}
            disabled={(day) => {
              if (minDate && day < minDate) return true;
              if (maxDate && day > maxDate) return true;
              return false;
            }}
            defaultMonth={date ?? maxDate ?? new Date()}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function parseIsoDate(s: string | undefined): Date | undefined {
  if (!s) return undefined;
  const d = parseISO(s);
  return isValid(d) ? d : undefined;
}