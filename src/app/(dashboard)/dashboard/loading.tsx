import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading(): JSX.Element {
  return (
    <div className="space-y-8">
      {/* Section 1 — Stats skeleton */}
      <section>
        <div className="mb-4">
          <Skeleton className="h-4 w-48 mb-1.5" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))}
        </div>
      </section>

      {/* Section 2 — Profiles skeleton */}
      <section>
        <div className="mb-4">
          <Skeleton className="h-4 w-32 mb-1.5" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div>
                    <Skeleton className="h-4 w-20 mb-1.5" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                </div>
                <Skeleton className="w-9 h-5 rounded-full" />
              </div>
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-3/4 mb-5" />
              <Skeleton className="h-9 w-full rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* Section 3 — RSE skeleton */}
      <section>
        <div className="mb-4">
          <Skeleton className="h-4 w-44 mb-1.5" />
          <Skeleton className="h-3 w-72" />
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
            <Skeleton className="h-5 w-14 rounded" />
          </div>
          <Skeleton className="h-20 w-full rounded-lg mb-5" />
          <div className="flex items-center justify-between pt-4 border-t border-surface-border">
            <div>
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-9 w-28 rounded" />
          </div>
        </div>
      </section>

      {/* Section 4 — Quick Actions skeleton */}
      <section>
        <div className="mb-4">
          <Skeleton className="h-4 w-32 mb-1.5" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4">
              <Skeleton className="w-10 h-10 rounded-lg mb-3" />
              <Skeleton className="h-3.5 w-28 mb-1.5" />
              <Skeleton className="h-3 w-36" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
