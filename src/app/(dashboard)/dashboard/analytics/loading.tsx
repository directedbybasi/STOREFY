import React from "react";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading analytics">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="space-y-1.5">
          <div className="h-7 w-48 rounded-md bg-slate-800/80" />
          <div className="h-3.5 w-72 rounded-md bg-slate-800/50" />
        </div>
        <div className="h-6 w-24 rounded-full bg-slate-800/60" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-slate-800/60" />
            <div className="h-6 w-28 rounded bg-slate-800/90" />
          </div>
        ))}
      </div>

      {/* Main Chart Skeleton */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="h-4 w-36 rounded bg-slate-800/80" />
        <div className="h-64 rounded-lg bg-slate-950/40 border border-slate-850 flex items-end p-4 gap-4">
          {[40, 70, 55, 90, 65, 80, 45, 95].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-slate-800/50" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
