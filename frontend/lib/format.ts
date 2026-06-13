export function formatCurrency(
  v: string | number | null | undefined,
  opts: { maximumFractionDigits?: number } = {},
): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? Number.parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.maximumFractionDigits ?? 0,
  });
}

export function formatPercent(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function titleCase(s: string): string {
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
