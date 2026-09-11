import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: React.ReactNode;
  onRetry?: () => void;
  action?: React.ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  description = "We encountered an issue loading this information. Please try again.",
  onRetry,
  action,
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-border bg-card/60 p-8 text-center sm:p-10",
        className
      )}
      {...props}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3">
        <AlertTriangle className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      <div className="mt-4 flex items-center gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
