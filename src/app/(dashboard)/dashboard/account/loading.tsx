import { Skeleton } from "@/components/ui/skeleton";

export default function AccountLoading(): JSX.Element {
  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <Skeleton className="w-11 h-11 rounded-lg" />
        <div>
          <Skeleton className="h-5 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Banner */}
      <Skeleton className="h-14 w-full rounded-lg" />

      {/* Identity section */}
      <div className="card p-5 md:p-6 space-y-5">
        <div>
          <Skeleton className="h-4 w-40 mb-1" />
          <Skeleton className="h-3 w-72" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-[45px] w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
      </div>

      {/* Contact section */}
      <div className="card p-5 md:p-6 space-y-5">
        <div>
          <Skeleton className="h-4 w-44 mb-1" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-10 w-full rounded md:col-span-2" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
      </div>

      {/* Languages */}
      <div className="card p-5 md:p-6">
        <Skeleton className="h-4 w-24 mb-3" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded" />
          <Skeleton className="h-10 w-28 rounded" />
          <Skeleton className="h-10 w-28 rounded" />
        </div>
      </div>

      {/* Share section */}
      <div className="card p-5 md:p-6 space-y-4">
        <Skeleton className="h-4 w-40 mb-1" />
        <Skeleton className="h-9 w-full rounded" />
        <Skeleton className="h-9 w-full rounded" />
        <Skeleton className="h-9 w-full rounded" />
      </div>
    </div>
  );
}
