import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 pb-5 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className
      )}
      {...props}
    >
      <div className="space-y-1 min-w-0">
        {/* Subtle breadcrumbs for deep routes only */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
                  {isLast || !crumb.href ? (
                    <span className="font-medium text-foreground truncate">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="hover:text-foreground transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        )}

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
          {title}
        </h1>

        {description && (
          <div className="text-xs sm:text-[13px] text-muted-foreground leading-normal">
            {description}
          </div>
        )}

        {children}
      </div>

      {/* Right-aligned actions (stacked cleanly on mobile) */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
}
