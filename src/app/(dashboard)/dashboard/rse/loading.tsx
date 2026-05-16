import { Skeleton } from "@/components/ui/skeleton";

export default function RseLoading(): JSX.Element {
  return (
    <div className="max-w-[1120px] mx-auto space-y-6">
      {/* Hero */}
      <Skeleton className="h-40 w-full rounded-lg" />
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      {/* Receipts */}
      <div className="card p-5 md:p-6 space-y-3">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </div>
  );
}
