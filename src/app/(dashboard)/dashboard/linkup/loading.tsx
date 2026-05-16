import { Skeleton } from "@/components/ui/skeleton";

export default function LinkupLoading(): JSX.Element {
  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      <div className="flex items-start gap-3">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div>
          <Skeleton className="h-5 w-36 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="card p-5 md:p-6 space-y-4">
        <Skeleton className="h-4 w-40 mb-3" />
        <Skeleton className="h-9 w-full rounded" />
        <Skeleton className="h-9 w-full rounded" />
      </div>
      <div className="card p-5 md:p-6 space-y-5">
        <Skeleton className="h-4 w-36 mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      </div>
      <div className="card p-5 md:p-6">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="flex gap-6">
          <Skeleton className="w-[160px] h-[160px] rounded-lg" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-9 w-full rounded" />
            <Skeleton className="h-9 w-48 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
