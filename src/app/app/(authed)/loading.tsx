import { Skeleton } from "@/components/ui/skeleton";

// Rendered by Next.js while the closest matching page below the
// authed PWA layout is server-rendering. The layout (header + bottom
// nav) stays mounted; only the content area swaps to this skeleton.
export default function AppAuthedLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>

      <Skeleton className="h-32 rounded-xl" />

      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  );
}