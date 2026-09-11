import React from "react";

export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading settings">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4 space-y-1.5">
        <div className="h-7 w-36 rounded-md bg-slate-800/80" />
        <div className="h-3.5 w-80 rounded-md bg-slate-800/50" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1 rounded-lg w-fit">
        <div className="h-8 w-24 rounded bg-slate-800/80" />
        <div className="h-8 w-24 rounded bg-slate-800/50" />
        <div className="h-8 w-28 rounded bg-slate-800/50" />
        <div className="h-8 w-24 rounded bg-slate-800/50" />
      </div>

      {/* Form Card Skeleton */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 space-y-5">
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-slate-800/80" />
          <div className="h-3 w-64 rounded bg-slate-800/50" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-800/60" />
            <div className="h-10 rounded-md bg-slate-950/80 border border-slate-850" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-800/60" />
            <div className="h-10 rounded-md bg-slate-950/80 border border-slate-850" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-800/60" />
            <div className="h-10 rounded-md bg-slate-950/80 border border-slate-850" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-800/60" />
            <div className="h-10 rounded-md bg-slate-950/80 border border-slate-850" />
          </div>
        </div>
      </div>
    </div>
  );
}
