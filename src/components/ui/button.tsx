import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm border border-primary/20 font-semibold",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
        outline:
          "border border-border bg-background hover:bg-muted text-foreground",
        ghost:
          "hover:bg-muted/70 text-foreground hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-destructive/20 font-medium",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto font-normal",
        subtle:
          "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent hover:border-border",
      },
      size: {
        default: "h-9 px-3.5 py-1.5 text-[13px]",
        xs: "h-7 rounded px-2 text-[11px]",
        sm: "h-8 rounded-md px-2.5 text-xs",
        lg: "h-10 rounded-md px-5 text-sm",
        icon: "h-8 w-8 p-0",
        "icon-sm": "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
