import React from "react";

export default function InventoryLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading inventory">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1.5">
          <div className="h-7 w-48 rounded-md bg-slate-800/80" />
          <div className="h-3.5 w-80 rounded-md bg-slate-800/50" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-28 rounded-md bg-slate-800/60" />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-2">
            <div className="h-3 w-16 rounded bg-slate-800/60" />
            <div className="h-6 w-12 rounded bg-slate-800/80" />
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded bg-slate-800/70" />
          <div className="h-7 w-16 rounded bg-slate-800/50" />
          <div className="h-7 w-16 rounded bg-slate-800/50" />
        </div>
        <div className="h-8 w-60 rounded bg-slate-800/60" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((row) => (
          <div key={row} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-850">
            <div className="space-y-1.5">
              <div className="h-4 w-40 rounded bg-slate-800/80" />
              <div className="h-3 w-28 rounded bg-slate-800/50" />
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 w-16 rounded bg-slate-800/70" />
              <div className="h-4 w-16 rounded bg-slate-800/70" />
              <div className="h-7 w-16 rounded bg-slate-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
