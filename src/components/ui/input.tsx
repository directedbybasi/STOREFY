import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error = false, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border bg-background px-3 py-1.5 text-xs sm:text-[13px] text-foreground transition-all duration-150",
          "placeholder:text-muted-foreground/60",
          "focus-visible:outline-none focus-visible:ring-1.5 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30",
          error ? "border-rose-500 focus-visible:ring-rose-500" : "border-input",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
