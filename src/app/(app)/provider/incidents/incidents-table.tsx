"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import type { IncidentSeverity, IncidentStatus, IncidentType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type IncidentRow = {
  id: string;
  number: string;
  type: IncidentType | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  participantName: string | null;
  triage: "internal" | "ndis-pending" | "ndis-submitted" | "overdue";
  occurredAt: string;
};

const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  MINOR: "Minor",
  MODERATE: "Moderate",
  SERIOUS: "Serious",
  REPORTABLE: "Reportable",
};
const STATUS_LABEL: Record<IncidentStatus, string> = {
  DRAFT: "Draft",
  REPORTED: "Reported",
  UNDER_REVIEW: "Under review",
  CLOSED: "Closed",
};
const TYPE_LABEL: Record<IncidentType, string> = {
  INJURY: "Injury",
  ABUSE: "Abuse",
  NEGLECT: "Neglect",
  UNLAWFUL_CONTACT: "Unlawful contact",
  UNAUTHORISED_RESTRICTIVE_PRACTICE: "Restrictive practice",
  PROPERTY_DAMAGE: "Property damage",
  MEDICATION_ERROR: "Medication error",
  MISSING_PERSON: "Missing person",
  DEATH: "Death",
  OTHER: "Other",
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

const TRIAGE_LABEL: Record<IncidentRow["triage"], string> = {
  internal: "Internal only",
  "ndis-pending": "NDIS — pending",
  "ndis-submitted": "NDIS — submitted",
  overdue: "Overdue",
};

type SortKey = "number" | "type" | "severity" | "status" | "participant" | "date";

export function IncidentsTable({ rows }: { rows: IncidentRow[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<IncidentStatus>>(
    new Set()
  );
  const [severityFilter, setSeverityFilter] = useState<Set<IncidentSeverity>>(
    new Set()
  );
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({
    key: "date",
    asc: false,
  });

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
    out = [...out].sort((a, b) => {
      const dir = sort.asc ? 1 : -1;
      switch (sort.key) {
        case "number":
          return a.number.localeCompare(b.number) * dir;
        case "type":
          return (a.type ?? "").localeCompare(b.type ?? "") * dir;
        case "severity":
          return a.severity.localeCompare(b.severity) * dir;
        case "status":
          return a.status.localeCompare(b.status) * dir;
        case "participant":
          return (
            (a.participantName ?? "").localeCompare(b.participantName ?? "") * dir
          );
        case "date":
          return (
            (new Date(a.occurredAt).getTime() -
              new Date(b.occurredAt).getTime()) *
            dir
          );
      }
    });
    return out;
  }, [rows, search, statusFilter, severityFilter, sort]);

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

  const onSort = (key: SortKey) => {
    setSort((prev) =>
      prev.key === key ? { key, asc: !prev.asc } : { key, asc: true }
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by incident # or participant"
            className="pl-9"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Plus />
                Status
                {statusFilter.size > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">
                    {statusFilter.size}
                  </Badge>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator />
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

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="sm">
                <Plus />
                Severity
                {severityFilter.size > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">
                    {severityFilter.size}
                  </Badge>
                )}
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Filter by severity</DropdownMenuLabel>
            <DropdownMenuSeparator />
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-x-auto">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <SortableHeader sort={sort} k="number" onSort={onSort}>
              Incident #
            </SortableHeader>
            <SortableHeader sort={sort} k="type" onSort={onSort}>
              Type
            </SortableHeader>
            <SortableHeader sort={sort} k="severity" onSort={onSort}>
              Severity
            </SortableHeader>
            <SortableHeader sort={sort} k="status" onSort={onSort}>
              Status
            </SortableHeader>
            <SortableHeader sort={sort} k="participant" onSort={onSort}>
              Participant
            </SortableHeader>
            <TableHead>Triage</TableHead>
            <SortableHeader sort={sort} k="date" onSort={onSort}>
              Date
            </SortableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No results.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link
                    href={`/provider/incidents/${r.id}`}
                    className="font-mono text-xs font-medium text-primary hover:underline"
                  >
                    {r.number}
                  </Link>
                </TableCell>
                <TableCell className="text-sm">
                  {r.type ? TYPE_LABEL[r.type] : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={SEVERITY_VARIANT[r.severity]}>
                    {SEVERITY_LABEL[r.severity]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{STATUS_LABEL[r.status]}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {r.participantName ?? "—"}
                </TableCell>
                <TableCell className="text-xs">
                  <span
                    className={cn(
                      r.triage === "overdue" &&
                        "font-medium text-destructive",
                      r.triage === "ndis-pending" && "text-amber-700",
                      r.triage === "ndis-submitted" && "text-emerald-700",
                      r.triage === "internal" && "text-muted-foreground"
                    )}
                  >
                    {TRIAGE_LABEL[r.triage]}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(r.occurredAt), "dd/MM/yyyy")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>

      <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
        <span>
          {filtered.length} of {rows.length} row{rows.length === 1 ? "" : "s"}
        </span>
      </div>
    </Card>
  );
}

function SortableHeader({
  k,
  sort,
  onSort,
  children,
}: {
  k: SortKey;
  sort: { key: SortKey; asc: boolean };
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = sort.key === k;
  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSort(k)}
        className={cn(
          "-ml-2 h-7 px-2 text-xs font-medium",
          active ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {children}
        <ArrowUpDown className="ml-1 h-3 w-3" />
      </Button>
    </TableHead>
  );
}