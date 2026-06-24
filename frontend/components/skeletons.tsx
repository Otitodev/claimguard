import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Mirrors the `h1` + subtitle block at the top of every dashboard page. */
export function PageHeaderSkeleton({
  subtitleWidth = "w-64",
}: {
  subtitleWidth?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-7 w-44 rounded-md" />
      <Skeleton className={`h-4 rounded-md ${subtitleWidth}`} />
    </div>
  );
}

/**
 * A bordered table with the real column headers and `rows` of skeleton cells.
 * `widths` sizes the bar in each column to roughly match its real content;
 * a width ending in `text-right` aligns the bar to the right (money columns).
 */
export function TableSkeleton({
  headers,
  widths,
  rows = 6,
}: {
  headers: string[];
  widths: string[];
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead
                key={h}
                className={widths[i]?.includes("ml-auto") ? "text-right" : ""}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              {headers.map((h, i) => (
                <TableCell key={h}>
                  <Skeleton className={`h-4 rounded-md ${widths[i] ?? "w-24"}`} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Mirrors `MetricCard` — small label over a large value, icon stub top-right. */
export function MetricCardSkeleton() {
  return (
    <Card className="relative gap-2 overflow-hidden">
      <CardHeader>
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="mt-2 h-8 w-20 rounded-md" />
      </CardHeader>
      <Skeleton className="absolute right-5 top-5 size-5 rounded-md" />
    </Card>
  );
}

/** Mirrors a chart card: title + description over a tall plot area. */
export function ChartCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-44 rounded-md" />
        <Skeleton className="mt-2 h-4 w-56 rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}
