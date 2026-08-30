import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-transparent bg-secondary text-secondary-foreground",
      success: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      error: "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-300",
      warning: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
      outline: "text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
