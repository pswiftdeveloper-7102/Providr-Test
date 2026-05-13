import { Skeleton } from "@/components/ui/skeleton";

export default function IncidentDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-24" />

      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-48" />
      </div>

      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );
}