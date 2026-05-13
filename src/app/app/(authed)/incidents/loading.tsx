import { Skeleton } from "@/components/ui/skeleton";

export default function IncidentsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-9 w-20 rounded-md" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-12" />
      </div>

      <ul className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i}>
            <Skeleton className="h-20 rounded-xl" />
          </li>
        ))}
      </ul>
    </div>
  );
}