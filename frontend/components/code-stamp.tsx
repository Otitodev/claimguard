import { cn } from "@/lib/utils";

/**
 * Code stamp — the signature element (TRD §10). Every CPT/ICD/CARC code renders
 * as a small monospace badge, like an ink stamp on a paper claim form.
 */
export function CodeStamp({
  code,
  label,
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80",
        className,
      )}
    >
      {label ? <span className="mr-1 text-muted-foreground">{label}</span> : null}
      {code}
    </span>
  );
}

export function CodeStampRow({
  codes,
  label,
  max = 4,
}: {
  codes: string[];
  label?: string;
  max?: number;
}) {
  if (!codes?.length) return <span className="text-muted-foreground">—</span>;
  const shown = codes.slice(0, max);
  const rest = codes.length - shown.length;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((c) => (
        <CodeStamp key={c} code={c} label={label} />
      ))}
      {rest > 0 ? (
        <span className="font-mono text-xs text-muted-foreground">+{rest}</span>
      ) : null}
    </span>
  );
}
