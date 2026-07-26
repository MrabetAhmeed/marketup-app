import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTransactionsLoading(): JSX.Element {
  return (
    <div className="py-6 px-6">
      <Skeleton className="h-8 w-48 mb-6" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
