import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading(): JSX.Element {
  return (
    <div className="max-w-[720px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div>
          <Skeleton className="h-5 w-56 mb-2" />
          <Skeleton className="h-3 w-72" />
        </div>
      </div>

      {/* Password section */}
      <div className="card p-5 md:p-6 space-y-5">
        <div>
          <Skeleton className="h-4 w-32 mb-1" />
          <Skeleton className="h-3 w-80" />
        </div>
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-16 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
      </div>

      {/* Danger zone */}
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
