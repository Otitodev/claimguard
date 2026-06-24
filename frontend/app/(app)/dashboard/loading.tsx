import {
  ChartCardSkeleton,
  MetricCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/skeletons";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeaderSkeleton subtitleWidth="w-56" />

      {/* Plan & ROI card */}
      <Card className="relative overflow-hidden border-primary/20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full bg-primary/10 blur-3xl"
        />
        <CardHeader>
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="mt-2 h-6 w-56 rounded-md" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="mt-2 h-8 w-28 rounded-md" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-4 w-80 max-w-full rounded-md" />
        </CardContent>
      </Card>

      {/* 4-up metric grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* 2-up metric grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}
