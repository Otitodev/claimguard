import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function MetaItemSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3 w-16 rounded-md" />
      <Skeleton className="h-4 w-24 rounded-md" />
    </div>
  );
}

export default function ClaimDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-32 rounded-md" /> {/* back button */}
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-48 rounded-md" /> {/* patient name */}
          <Skeleton className="h-6 w-20 rounded-full" /> {/* status badge */}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Claim card */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-16 rounded-md" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <MetaItemSkeleton key={i} />
              ))}
            </CardContent>
          </Card>

          {/* Denial card */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <Skeleton className="h-4 w-48 rounded-md" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
              </div>
            </CardContent>
          </Card>

          {/* Appeal panel */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28 rounded-md" />
              <Skeleton className="mt-2 h-4 w-64 rounded-md" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Skeleton className="h-40 w-full rounded-lg" /> {/* letter body */}
              <div className="flex gap-2">
                <Skeleton className="h-9 w-28 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity timeline */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-20 rounded-md" />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="mt-1 size-2 shrink-0 rounded-full" />
                  <div className="flex w-full flex-col gap-1.5">
                    <Skeleton className="h-4 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-20 rounded-md" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
