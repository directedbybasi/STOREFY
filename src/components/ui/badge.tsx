import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/10 text-primary dark:text-primary",
        secondary:
          "border-border bg-secondary text-secondary-foreground",
        outline:
          "border-border bg-transparent text-foreground",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        error:
          "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400",
        destructive:
          "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-400",
        info:
          "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400",
        neutral:
          "border-border bg-muted/60 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const dotColorMap: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
  destructive: "bg-rose-500",
  info: "bg-sky-500",
  neutral: "bg-muted-foreground/60",
  default: "bg-primary",
  secondary: "bg-muted-foreground",
  outline: "bg-foreground/50",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  const currentVariant = variant || "default";
  const dotColor = dotColorMap[currentVariant] || "bg-current";

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotColor)} />}
      <span>{children}</span>
    </div>
  );
}

export { Badge, badgeVariants };
