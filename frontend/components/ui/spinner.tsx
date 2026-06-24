import { cn } from "@/lib/utils";

/**
 * A simple loading spinner — a spinning ring that inherits the current text
 * color (so it works on default and primary buttons alike). Size via className
 * (defaults to `size-4`).
 */
export function Spinner({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
      {...props}
    />
  );
}
