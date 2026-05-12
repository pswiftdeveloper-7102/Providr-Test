"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectValue,
} from "@/components/ui/select";
import {
  BrandedSelectItem,
  BrandedSelectTrigger,
} from "@/components/branded-select";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_ISO,
  findCountry,
} from "@/lib/country-codes";

/**
 * Reusable phone-number field with a country-code dropdown defaulting
 * to Australia. The form submits one field with `name`, value in E.164
 * format (e.g. "+61412345678"). If the input number is empty, an empty
 * string is submitted — server-side schemas that allow optional phones
 * still get the right value.
 *
 * For edit forms, pass `defaultValue` as the existing E.164 string;
 * the component parses it back to country + local number on mount.
 */
export function PhoneField({
  name,
  label = "Phone",
  required,
  defaultValue,
  error,
  helperText,
}: {
  name: string;
  label?: string;
  required?: boolean;
  defaultValue?: string | null;
  error?: string;
  helperText?: string;
}) {
  const initial = parseE164(defaultValue ?? "");
  const [countryIso, setCountryIso] = useState(initial.iso);
  const [number, setNumber] = useState(initial.number);

  const country =
    findCountry(countryIso) ?? findCountry(DEFAULT_COUNTRY_ISO)!;

  const trimmed = number.replace(/\s+/g, "");
  const e164 = trimmed ? `+${country.dialCode}${trimmed}` : "";

  return (
    <div className="space-y-2">
      <Label htmlFor={`${name}-number`}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <div className="flex gap-2">
        <Select
          value={countryIso}
          onValueChange={(v) => v && setCountryIso(v)}
        >
          <BrandedSelectTrigger
            aria-label="Country code"
            className="w-[120px] justify-between"
          >
            <SelectValue>
              <span aria-hidden className="text-base leading-none">
                {country.flag}
              </span>
              <span className="font-medium">+{country.dialCode}</span>
            </SelectValue>
          </BrandedSelectTrigger>
          <SelectContent className="min-w-[260px]">
            {COUNTRY_CODES.map((c) => (
              <BrandedSelectItem key={c.iso} value={c.iso}>
                <span aria-hidden className="mr-2 text-base leading-none">
                  {c.flag}
                </span>
                <span className="flex-1">{c.name}</span>
                <span className="ml-3 text-xs text-muted-foreground tabular-nums">
                  +{c.dialCode}
                </span>
              </BrandedSelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={`${name}-number`}
          type="tel"
          inputMode="tel"
          value={number}
          onChange={(e) =>
            setNumber(e.target.value.replace(/[^0-9 ]/g, ""))
          }
          autoComplete="tel-national"
          placeholder="412 345 678"
          className="flex-1"
          aria-invalid={!!error}
          required={required}
        />
      </div>
      <input type="hidden" name={name} value={e164} />
      {helperText && !error && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/**
 * Parse an E.164 phone back to (countryIso, localNumber). Uses the
 * longest-prefix-wins rule so a "+1..." doesn't collide with "+1xxx..."
 * (we don't currently ship any 3-digit codes starting with "1" but the
 * sort handles it for free).
 */
function parseE164(value: string): { iso: string; number: string } {
  if (!value || !value.startsWith("+")) {
    return { iso: DEFAULT_COUNTRY_ISO, number: value ?? "" };
  }
  const stripped = value.slice(1);
  const sorted = [...COUNTRY_CODES].sort(
    (a, b) => b.dialCode.length - a.dialCode.length
  );
  for (const c of sorted) {
    if (stripped.startsWith(c.dialCode)) {
      return { iso: c.iso, number: stripped.slice(c.dialCode.length) };
    }
  }
  return { iso: DEFAULT_COUNTRY_ISO, number: stripped };
}