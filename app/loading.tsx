import { SupplierListSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pt-4 md:px-6">
      <div className="mb-4 h-24 animate-pulse rounded-xl bg-white" />
      <SupplierListSkeleton />
    </div>
  );
}
