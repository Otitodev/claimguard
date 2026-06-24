import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClaimsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton subtitleWidth="w-48" />

      <div className="flex flex-col gap-4">
        {/* status filter + count */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-52 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
        </div>

        <TableSkeleton
          headers={[
            "Patient",
            "Date of Service",
            "Payer",
            "CPT",
            "Billed",
            "Status",
          ]}
          widths={["w-32", "w-20", "w-28", "w-24", "w-16 ml-auto", "w-20"]}
          rows={8}
        />
      </div>
    </div>
  );
}
