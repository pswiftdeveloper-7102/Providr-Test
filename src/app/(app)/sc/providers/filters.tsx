"use client";

import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export function ProviderFilters({
  defaultQ,
  defaultAccepting,
}: {
  defaultQ: string;
  defaultAccepting: boolean;
}) {
  const [accepting, setAccepting] = useState(defaultAccepting);
  const hasFilters = defaultQ || defaultAccepting;

  return (
    <form className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={defaultQ}
          placeholder="Search by name, service, or contact"
          className="pl-8"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        {/* Hidden input carries the form value; shadcn Checkbox is the UI */}
        {accepting && (
          <input type="hidden" name="filter" value="accepting" />
        )}
        <Checkbox
          checked={accepting}
          onCheckedChange={(c) => setAccepting(c === true)}
          aria-label="Only show accepting providers"
        />
        Accepting only
      </label>
      <Button type="submit" size="sm" variant="outline">
        Apply
      </Button>
      {hasFilters && (
        <Button
          size="sm"
          variant="ghost"
          render={<Link href="/sc/providers" />}
        >
          Clear
        </Button>
      )}
    </form>
  );
}