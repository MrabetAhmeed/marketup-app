import { Skeleton } from "@/components/ui/skeleton";

export default function TraceupLoading(): JSX.Element {
  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div>
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="card overflow-hidden">
        <div className="p-5 md:p-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-10 w-full rounded mb-2" />
        </div>
        <div className="border-t border-surface-border px-4 py-2">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded" />
            ))}
          </div>
        </div>
        <div className="p-5 md:p-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
