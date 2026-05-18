// URL-based pagination wrapper around the shadcn Pagination primitives.
// Each page link is a plain anchor with `?page=N` (full navigation —
// server components re-run with new searchParams to load that page).
//
// Usage from a server component:
//
//   const page = Number(searchParams.page ?? 1);
//   const perPage = 25;
//   const [rows, total] = await Promise.all([
//     db.x.findMany({ skip: (page - 1) * perPage, take: perPage }),
//     db.x.count(),
//   ]);
//
//   return (
//     <>
//       <Table>...</Table>
//       <PageNav page={page} perPage={perPage} total={total} />
//     </>
//   );

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type PageNavProps = {
  page: number;
  perPage: number;
  total: number;
  // Extra query-string params to preserve when paginating (e.g. filters).
  preserve?: Record<string, string | undefined>;
  // Path the links point at. Defaults to "" (current path, query-only).
  basePath?: string;
  className?: string;
};

// Compute the visible page-number window with ellipses. Always shows:
// first page, last page, current ± 1, and ellipses for the gaps.
//   total=20, current=10  →  1 … 9 10 11 … 20
//   total=5, current=2    →  1 2 3 4 5
function visiblePages(current: number, last: number): (number | "ellipsis")[] {
  if (last <= 7) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }
  const out: (number | "ellipsis")[] = [1];
  if (current > 3) out.push("ellipsis");
  for (let n = Math.max(2, current - 1); n <= Math.min(last - 1, current + 1); n++) {
    out.push(n);
  }
  if (current < last - 2) out.push("ellipsis");
  out.push(last);
  return out;
}

function buildHref(
  basePath: string | undefined,
  page: number,
  preserve: Record<string, string | undefined> | undefined
): string {
  const params = new URLSearchParams();
  if (preserve) {
    for (const [k, v] of Object.entries(preserve)) {
      if (v !== undefined && v !== "") params.set(k, v);
    }
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  const prefix = basePath ?? "";
  return qs ? `${prefix}?${qs}` : prefix || "?";
}

export function PageNav({
  page,
  perPage,
  total,
  preserve,
  basePath,
  className,
}: PageNavProps) {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  if (lastPage <= 1) return null;

  const current = Math.min(Math.max(1, page), lastPage);
  const start = (current - 1) * perPage + 1;
  const end = Math.min(current * perPage, total);
  const pages = visiblePages(current, lastPage);

  return (
    <div className={className}>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            {current > 1 ? (
              <PaginationPrevious
                href={buildHref(basePath, current - 1, preserve)}
              />
            ) : (
              <PaginationPrevious
                aria-disabled
                className="pointer-events-none opacity-50"
                href="#"
              />
            )}
          </PaginationItem>

          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <PaginationItem key={`e-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === current}
                  href={buildHref(basePath, p, preserve)}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}

          <PaginationItem>
            {current < lastPage ? (
              <PaginationNext
                href={buildHref(basePath, current + 1, preserve)}
              />
            ) : (
              <PaginationNext
                aria-disabled
                className="pointer-events-none opacity-50"
                href="#"
              />
            )}
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        {start}–{end} of {total}
      </p>
    </div>
  );
}