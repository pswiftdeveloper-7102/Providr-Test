"use client";

import { useMemo, useState } from "react";
import { Filter, Search } from "lucide-react";
import type { IncidentSeverity, IncidentStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type Props = {
  rows: IncidentRowLite[];
  labels: {
    severity: Record<IncidentSeverity, unknown>;
    status: Record<IncidentStatus, string>;
  };
  renderRow: (r: IncidentRowLite) => React.ReactNode;
  emptyState: React.ReactNode;
};

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  MINOR: "Minor",
  MODERATE: "Moderate",
  SERIOUS: "Serious",
  REPORTABLE: "Reportable",
};

export function IncidentsFilter({ rows, labels, renderRow, emptyState }: Props) {
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
            {(Object.keys(labels.status) as IncidentStatus[]).map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={statusFilter.has(s)}
                onCheckedChange={() =>
                  toggle(statusFilter, setStatusFilter, s)
                }
              >
                {labels.status[s]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filtered.length === 0 ? (
        emptyState
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id}>{renderRow(r)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}