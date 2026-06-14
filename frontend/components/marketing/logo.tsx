import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="ClaimGuard home"
      className={cn("inline-flex items-center", className)}
    >
      {/* Full lockup (mark + wordmark). SVG needs no optimization. */}
      <Image
        src="/full-logo.svg"
        alt="ClaimGuard"
        width={1310}
        height={404}
        priority
        unoptimized
        className="h-7 w-auto"
      />
    </Link>
  );
}
