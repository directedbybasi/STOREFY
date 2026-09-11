import * as React from "react";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  label?: string;
  value: string | number;
  delta?: {
    value: string | number;
    isPositive?: boolean;
    isNeutral?: boolean;
    comparisonText?: string;
  };
  subtitle?: string;
  helpText?: string;
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

export function StatCard({
  title,
  label,
  value,
  delta,
  subtitle,
  helpText,
  icon,
  className,
  loading = false,
  ...props
}: StatCardProps) {
  const displayTitle = title ?? label ?? "";
  const displaySubtitle = subtitle ?? helpText;

  if (loading) {
    return (
      <Card className={cn("p-4 border-border bg-card", className)} {...props}>
        <CardContent className="p-0 space-y-3">
          <div className="h-3.5 w-20 rounded bg-muted animate-pulse" />
          <div className="h-7 w-32 rounded bg-muted animate-pulse" />
          <div className="h-3 w-24 rounded bg-muted/60 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "p-4 border-border bg-card transition-colors hover:border-border/80",
        className
      )}
      {...props}
    >
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {displayTitle}
          </span>
          {icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted/50 text-muted-foreground shrink-0">
              {React.isValidElement(icon)
                ? icon
                : typeof icon === "function"
                ? React.createElement(icon, { className: "h-3.5 w-3.5" })
                : null}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-2">
          <div className="text-xl font-semibold tracking-tight text-foreground font-tabular">
            {value}
          </div>

          {delta && (
            <div
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium font-tabular",
                delta.isNeutral
                  ? "bg-muted text-muted-foreground"
                  : delta.isPositive
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400"
              )}
            >
              {delta.isNeutral ? (
                <Minus className="h-2.5 w-2.5" />
              ) : delta.isPositive ? (
                <ArrowUpRight className="h-2.5 w-2.5" />
              ) : (
                <ArrowDownRight className="h-2.5 w-2.5" />
              )}
              <span>{delta.value}</span>
            </div>
          )}
        </div>

        {(displaySubtitle || delta?.comparisonText) && (
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {delta?.comparisonText || displaySubtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
