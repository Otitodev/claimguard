import { PageHeaderSkeleton, TableSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function NeedsActionLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton subtitleWidth="w-96" />

      {/* Drafts near deadline */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-48 rounded-md" />
        <TableSkeleton
          headers={["Patient", "Payer", "Denial", "At Risk", "Deadline", "Action"]}
          widths={["w-32", "w-28", "w-16", "w-16 ml-auto", "w-24", "w-16 ml-auto"]}
          rows={3}
        />
      </div>

      {/* Awaiting payer response */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-56 rounded-md" />
        <TableSkeleton
          headers={["Patient", "Payer", "Denial", "At Risk", "Aging", "Action"]}
          widths={["w-32", "w-28", "w-16", "w-16 ml-auto", "w-20", "w-16 ml-auto"]}
          rows={2}
        />
      </div>
    </div>
  );
}
