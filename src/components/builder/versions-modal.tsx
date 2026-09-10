"use client";

import React, { useState, useEffect } from "react";
import { getThemeVersionsAction, rollbackThemeVersionAction } from "@/modules/builder/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { History, RotateCcw, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

interface VersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageSlug: string;
  onRollbackSuccess: () => void;
}

interface VersionItem {
  id: string;
  versionNumber: number;
  commitMessage: string | null;
  createdAt: Date;
}

export function VersionsModal({
  isOpen,
  onClose,
  pageSlug,
  onRollbackSuccess,
}: VersionsModalProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen]);

  const loadVersions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getThemeVersionsAction();
      setVersions(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load version history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async (version: VersionItem) => {
    if (
      !confirm(
        `Are you sure you want to rollback to Version v${version.versionNumber}? This will restore the published storefront to this snapshot.`
      )
    ) {
      return;
    }

    setIsRollingBack(true);
    setError(null);
    try {
      await rollbackThemeVersionAction(version.id, pageSlug);
      onRollbackSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Rollback failed");
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
            <History className="h-5 w-5 text-indigo-600" />
            <span>Theme Version History</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Immutable snapshots recorded upon each publish. You can safely rollback to any previous version at any time.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 pr-1">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading version history...</div>
          ) : versions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-1">
              <Clock className="mx-auto h-6 w-6 text-slate-400" />
              <p className="font-semibold">No published revisions yet</p>
              <p className="text-slate-400">Versions are created automatically whenever you click &quot;Publish&quot;.</p>
            </div>
          ) : (
            versions.map((ver, idx) => (
              <div
                key={ver.id}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Version v{ver.versionNumber}</span>
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Current Live</span>
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-[11px]">{ver.commitMessage || "Published snapshot"}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(ver.createdAt).toLocaleString()}
                  </p>
                </div>

                {idx !== 0 && (
                  <button
                    type="button"
                    disabled={isRollingBack}
                    onClick={() => handleRollback(ver)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-[11px] disabled:opacity-50 transition shadow-xs"
                  >
                    <RotateCcw className="h-3 w-3 text-indigo-600" />
                    <span>Rollback</span>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
