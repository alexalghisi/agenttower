import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm outline-none ring-ring placeholder:text-muted-foreground focus-visible:ring-2",
        className,
      )}
      {...props}
    />
  );
}
