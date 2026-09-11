import React from "react";

export default function AiLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading AI tools">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div className="space-y-1.5">
          <div className="h-7 w-48 rounded-md bg-slate-800/80" />
          <div className="h-3.5 w-80 rounded-md bg-slate-800/50" />
        </div>
        <div className="h-6 w-28 rounded-full bg-slate-800/60" />
      </div>

      {/* Quota KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-slate-800/60" />
            <div className="h-6 w-24 rounded bg-slate-800/90" />
          </div>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-slate-800/80" />
              <div className="h-4 w-32 rounded bg-slate-800/80" />
            </div>
            <div className="h-3 w-full rounded bg-slate-800/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
