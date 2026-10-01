import {
  CELL_CLASS,
  COLUMN_CLASS,
  SPARKLINE_SIZE,
} from "@/components/market/market-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Placeholder rows with the same columns and row height as MarketTable. */
export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      aria-busy="true"
      aria-label="Loading markets"
    >
      <table className="w-full table-fixed text-sm md:table-auto">
        <thead>
          <tr className="h-10 border-b border-border">
            <th className={cn(CELL_CLASS, COLUMN_CLASS.star)} />
            <th className={cn(CELL_CLASS, COLUMN_CLASS.rank)} />
            {(["coin", "price", "change", "range", "volume", "spark"] as const).map(
              (col) => (
                <th key={col} className={cn(CELL_CLASS, COLUMN_CLASS[col])}>
                  <Skeleton
                    className={cn(
                      "h-3 w-12",
                      col !== "coin" && col !== "spark" && "ml-auto",
                    )}
                  />
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className={cn(CELL_CLASS, COLUMN_CLASS.star)}>
                <Skeleton className="size-4" />
              </td>
              <td className={cn(CELL_CLASS, COLUMN_CLASS.rank)}>
                <Skeleton className="h-3 w-4" />
              </td>
              <td className={cn(CELL_CLASS, COLUMN_CLASS.coin)}>
                <div className="flex items-center gap-3 overflow-hidden">
                  <Skeleton className="size-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </td>
              <td className={cn(CELL_CLASS, COLUMN_CLASS.price)}>
                <Skeleton className="ml-auto h-3.5 w-20" />
              </td>
              <td className={cn(CELL_CLASS, COLUMN_CLASS.change)}>
                <Skeleton className="ml-auto h-6 w-16 rounded-full" />
              </td>
              <td className={cn(CELL_CLASS, COLUMN_CLASS.range)}>
                <div className="space-y-1.5">
                  <Skeleton className="ml-auto h-3 w-16" />
                  <Skeleton className="ml-auto h-3 w-16" />
                </div>
              </td>
              <td className={cn(CELL_CLASS, COLUMN_CLASS.volume)}>
                <Skeleton className="ml-auto h-3.5 w-14" />
              </td>
              <td className={cn(CELL_CLASS, COLUMN_CLASS.spark)}>
                <Skeleton style={SPARKLINE_SIZE} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
