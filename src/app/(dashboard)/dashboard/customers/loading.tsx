import React from "react";

export default function CustomersLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading customers">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div className="space-y-1.5">
          <div className="h-7 w-40 rounded-md bg-slate-800/80" />
          <div className="h-3.5 w-64 rounded-md bg-slate-800/50" />
        </div>
        <div className="h-8 w-28 rounded-md bg-slate-800/60" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-slate-800/60" />
            <div className="h-6 w-16 rounded bg-slate-800/90" />
          </div>
        ))}
      </div>

      {/* Customer Directory Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
        <div className="h-9 w-64 rounded bg-slate-800/60" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-850">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-800/80" />
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded bg-slate-800/80" />
                  <div className="h-3 w-48 rounded bg-slate-800/50" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-16 rounded bg-slate-800/70" />
                <div className="h-5 w-20 rounded-full bg-slate-800/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
