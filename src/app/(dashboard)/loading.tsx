import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page content">
      {/* Top Header Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Main Table Skeleton */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <Skeleton className="h-8 w-full sm:w-64" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between p-3 rounded-md border border-border/40 bg-muted/10"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16 hidden sm:block" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
