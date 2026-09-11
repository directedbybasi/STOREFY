import React from "react";

export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading products">
      {/* Header Bar Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-36 rounded-md bg-slate-800/80" />
          <div className="h-3.5 w-64 rounded-md bg-slate-800/50" />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-24 rounded-md bg-slate-800/60" />
          <div className="h-8 w-24 rounded-md bg-slate-800/60" />
          <div className="h-8 w-28 rounded-md bg-slate-800/90" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <div className="h-6 w-20 rounded bg-slate-800/80" />
        <div className="h-6 w-16 rounded bg-slate-800/50" />
        <div className="h-6 w-16 rounded bg-slate-800/50" />
        <div className="h-6 w-16 rounded bg-slate-800/50" />
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5 h-9 rounded-md bg-slate-800/60" />
        <div className="sm:col-span-3 h-9 rounded-md bg-slate-800/50" />
        <div className="sm:col-span-2 h-9 rounded-md bg-slate-800/50" />
        <div className="sm:col-span-2 h-9 rounded-md bg-slate-800/50" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-850">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-800/70 shrink-0" />
              <div className="space-y-1.5">
                <div className="h-4 w-44 rounded bg-slate-800/80" />
                <div className="h-3 w-24 rounded bg-slate-800/40" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-5 w-16 rounded-full bg-slate-800/70" />
              <div className="h-4 w-16 rounded bg-slate-800/80" />
              <div className="h-7 w-12 rounded bg-slate-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
