"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Clock, Filter, Search } from "lucide-react";
import { format } from "date-fns";
import type { IncidentSeverity, IncidentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export type IncidentRowLite = {
  id: string;
  number: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  participantName: string | null;
  occurredAt: string;
  overdue: boolean;
};

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  MINOR: "Minor",
  MODERATE: "Moderate",
  SERIOUS: "Serious",
  REPORTABLE: "Reportable",
};

const SEVERITY_VARIANT: Record<
  IncidentSeverity,
  "default" | "secondary" | "outline" | "destructive"
> = {
  MINOR: "outline",
  MODERATE: "secondary",
  SERIOUS: "default",
  REPORTABLE: "destructive",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  DRAFT: "Draft",
  REPORTED: "Reported",
  UNDER_REVIEW: "Under review",
  CLOSED: "Closed",
};

export function IncidentsFilter({ rows }: { rows: IncidentRowLite[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<IncidentStatus>>(
    new Set()
  );
  const [severityFilter, setSeverityFilter] = useState<Set<IncidentSeverity>>(
    new Set()
  );

  const filtered = useMemo(() => {
    let out = rows;
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          r.number.toLowerCase().includes(q) ||
          (r.participantName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (statusFilter.size > 0) {
      out = out.filter((r) => statusFilter.has(r.status));
    }
    if (severityFilter.size > 0) {
      out = out.filter((r) => severityFilter.has(r.severity));
    }
    return out;
  }, [rows, search, statusFilter, severityFilter]);

  const toggle = <T,>(
    set: Set<T>,
    setSet: (s: Set<T>) => void,
    value: T
  ) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setSet(next);
  };

  const totalActive = statusFilter.size + severityFilter.size;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by # or participant"
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm" className="px-3">
                <Filter />
                {totalActive > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">
                    {totalActive}
                  </Badge>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Severity</DropdownMenuLabel>
            {(Object.keys(SEVERITY_LABEL) as IncidentSeverity[]).map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={severityFilter.has(s)}
                onCheckedChange={() =>
                  toggle(severityFilter, setSeverityFilter, s)
                }
              >
                {SEVERITY_LABEL[s]}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {(Object.keys(STATUS_LABEL) as IncidentStatus[]).map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={statusFilter.has(s)}
                onCheckedChange={() =>
                  toggle(statusFilter, setStatusFilter, s)
                }
              >
                {STATUS_LABEL[s]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No incidents match those filters.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/incidents/${r.id}`}
                className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition-colors active:bg-muted"
              >
                <div className="flex flex-1 flex-col gap-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-medium text-primary">
                      {r.number}
                    </span>
                    <Badge
                      variant={SEVERITY_VARIANT[r.severity]}
                      className="text-[10px]"
                    >
                      {r.severity.toLowerCase()}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {STATUS_LABEL[r.status]}
                    </Badge>
                    {r.overdue && (
                      <Badge variant="destructive" className="text-[10px]">
                        overdue
                      </Badge>
                    )}
                  </div>
                  <span className="truncate text-sm font-medium">
                    {r.participantName ?? "Unspecified participant"}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(r.occurredAt), "dd/MM/yyyy, h:mm a")}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}