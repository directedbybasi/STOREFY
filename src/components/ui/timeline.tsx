import * as React from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimelineItemState = "completed" | "current" | "upcoming" | "error";

export interface TimelineItem {
  id: string | number;
  title: string;
  description?: React.ReactNode;
  timestamp?: string | Date;
  state?: TimelineItemState;
}

export interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TimelineItem[];
}

export function Timeline({ items, className, ...props }: TimelineProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const state = item.state || "completed";

        return (
          <div key={item.id} className="relative flex gap-3">
            {/* Vertical Connecting Line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-3.5 top-6 bottom-0 w-[1.5px] -translate-x-1/2",
                  state === "completed" ? "bg-primary/40" : "bg-border"
                )}
              />
            )}

            {/* Node Icon */}
            <div
              className={cn(
                "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                state === "completed"
                  ? "border-primary bg-primary text-primary-foreground"
                  : state === "current"
                    ? "border-primary bg-background text-primary ring-4 ring-primary/10"
                    : state === "error"
                      ? "border-rose-500 bg-rose-500/10 text-rose-500"
                      : "border-border bg-muted/40 text-muted-foreground/60"
              )}
            >
              {state === "completed" ? (
                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              ) : (
                <Circle className="h-2 w-2 fill-current" />
              )}
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col pt-0.5 pb-2">
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={cn(
                    "text-xs font-semibold tracking-tight",
                    state === "upcoming" ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {item.title}
                </p>
                {item.timestamp && (
                  <span className="text-[11px] text-muted-foreground/70 font-tabular">
                    {typeof item.timestamp === "string"
                      ? item.timestamp
                      : new Date(item.timestamp).toLocaleString()}
                  </span>
                )}
              </div>

              {item.description && (
                <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
