import React from "react";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading page content">
      {/* Top Header Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-md bg-slate-800/80" />
          <div className="h-3.5 w-72 rounded-md bg-slate-800/50" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-24 rounded-md bg-slate-800/60" />
          <div className="h-8 w-28 rounded-md bg-slate-800/60" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded bg-slate-800/70" />
              <div className="h-8 w-8 rounded-lg bg-slate-800/80" />
            </div>
            <div className="h-6 w-24 rounded bg-slate-800/90" />
          </div>
        ))}
      </div>

      {/* Main Table / Content Skeleton */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-sm space-y-4">
        {/* Table Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="h-9 w-full sm:w-64 rounded-lg bg-slate-800/70" />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="h-9 w-24 rounded-lg bg-slate-800/60" />
            <div className="h-9 w-28 rounded-lg bg-slate-800/60" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-2.5 pt-2">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-850"
            >
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded bg-slate-800/70" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 rounded bg-slate-800/80" />
                  <div className="h-2.5 w-20 rounded bg-slate-800/40" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-16 rounded bg-slate-800/60 hidden sm:block" />
                <div className="h-5 w-20 rounded-full bg-slate-800/70" />
                <div className="h-4 w-16 rounded bg-slate-800/80" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
