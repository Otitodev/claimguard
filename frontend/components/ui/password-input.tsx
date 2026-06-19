"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { EyeIcon, EyeOffIcon } from "@hugeicons/core-free-icons";

import { Input } from "@/components/ui/input";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        className={className}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
      >
        <HugeiconsIcon icon={show ? EyeOffIcon : EyeIcon} className="size-4" />
      </button>
    </div>
  );
}
