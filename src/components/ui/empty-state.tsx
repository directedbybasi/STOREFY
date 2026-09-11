import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import Link from "next/link";

export interface EmptyStateActionConfig {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "secondary" | "outline";
}

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode | React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode | EmptyStateActionConfig;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  const renderAction = () => {
    if (!action) return null;
    if (React.isValidElement(action)) return action;

    const actionConfig = action as EmptyStateActionConfig;
    if (actionConfig.href) {
      return (
        <Button asChild size="sm" variant={actionConfig.variant || "default"}>
          <Link href={actionConfig.href}>{actionConfig.label}</Link>
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        variant={actionConfig.variant || "default"}
        onClick={actionConfig.onClick}
      >
        {actionConfig.label}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-card/40 p-8 text-center sm:p-12",
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground mb-3.5">
          {React.isValidElement(icon)
            ? icon
            : typeof icon === "function"
            ? React.createElement(icon, { className: "h-5 w-5" })
            : null}
        </div>
      )}
      <h3 className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{renderAction()}</div>}
    </div>
  );
}
