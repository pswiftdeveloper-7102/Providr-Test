"use client";

// URL-driven search box for list pages. Submits on Enter (or "X" clear)
// and updates the current URL's `?q=` param while preserving any other
// query string (filters, etc.). Resets pagination to page 1 on every
// new search so users don't land on an empty page.
//
// Pair with the server-side WHERE clause in the list page:
//
//   const q = (sp.q ?? "").trim();
//   const where = {
//     orgId,
//     ...(q ? { OR: [
//       { firstName: { contains: q, mode: "insensitive" } },
//       { lastName:  { contains: q, mode: "insensitive" } },
//     ] } : {}),
//   };
//
// Built on shadcn Input + Button + lucide icons.

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  placeholder?: string;
  defaultValue?: string;
  /** Param name to write the search term to. Defaults to "q". */
  paramName?: string;
};

export function ListSearch({
  placeholder = "Search…",
  defaultValue = "",
  paramName = "q",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  function submit(newQ: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = newQ.trim();
    if (trimmed) params.set(paramName, trimmed);
    else params.delete(paramName);
    params.delete("page"); // reset to page 1 on new search
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
      className="relative w-full max-w-md"
      role="search"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          // Sync URL when the field loses focus and the value differs
          // from what's in the URL (covers Click-outside without Enter).
          const current = searchParams.get(paramName) ?? "";
          if (value.trim() !== current) submit(value);
        }}
        placeholder={placeholder}
        className="pl-9 pr-9"
        type="search"
        aria-label="Search"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          onClick={() => {
            setValue("");
            submit("");
          }}
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </form>
  );
}