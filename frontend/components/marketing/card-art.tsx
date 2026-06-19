"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

type IconType = Parameters<typeof HugeiconsIcon>[0]["icon"];

/**
 * Illustration banner for a card. Renders the image at `src`; if it hasn't
 * been generated/added yet (load error or no src), it falls back to a tinted
 * gradient with the section icon, so the layout never breaks.
 */
export function CardArt({
  src,
  icon,
  tone,
}: {
  src?: string;
  icon: IconType;
  tone: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted/40">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl bg-background/70 ring-1 ring-border backdrop-blur",
              tone,
            )}
          >
            <HugeiconsIcon icon={icon} className="size-7" />
          </span>
        </div>
      )}
    </div>
  );
}
