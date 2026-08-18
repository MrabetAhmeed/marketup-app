import { Skeleton } from "@/components/ui/skeleton";

export default function BillingLoading(): JSX.Element {
  return (
    <div className="max-w-[640px] mx-auto py-8">
      <Skeleton className="h-72 w-full rounded-lg" />
    </div>
  );
}
