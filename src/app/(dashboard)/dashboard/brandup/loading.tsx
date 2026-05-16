import { Skeleton } from "@/components/ui/skeleton";

export default function BrandupLoading(): JSX.Element {
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
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="card p-5 md:p-6 space-y-5">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-32 w-full rounded" />
      </div>
      <div className="card p-5 md:p-6">
        <Skeleton className="h-4 w-48 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
