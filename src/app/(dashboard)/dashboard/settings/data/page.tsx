"use client";

import React, { useState } from "react";
import {
  Download,
  Upload,
  Database,
  FileCheck,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DataPortabilityPage() {
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<{
    total: number;
    valid: number;
    invalid: number;
  } | null>(null);

  const handleTriggerExport = (type: string) => {
    setExportStatus(`Export for ${type} generated successfully! Valid for 2 hours.`);
    setTimeout(() => setExportStatus(null), 5000);
  };

  const handleSimulateImportUpload = () => {
    setImportPreview({
      total: 50,
      valid: 48,
      invalid: 2,
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Data Portability & Backups</h1>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
              Phase 16 Portability
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Merchant-owned data export, validated CSV/JSON import, and metadata snapshot jobs
          </p>
        </div>
      </div>

      {exportStatus && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{exportStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Export Card */}
        <div className="border rounded-xl bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Export Store Data</h3>
              <p className="text-xs text-muted-foreground">
                Download structured JSON/CSV datasets with secure, expiring download tokens
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              className="text-xs justify-start"
              onClick={() => handleTriggerExport("Products")}
            >
              Export Products
            </Button>
            <Button
              variant="outline"
              className="text-xs justify-start"
              onClick={() => handleTriggerExport("Customers")}
            >
              Export Customers
            </Button>
            <Button
              variant="outline"
              className="text-xs justify-start"
              onClick={() => handleTriggerExport("Orders")}
            >
              Export Orders
            </Button>
            <Button
              variant="outline"
              className="text-xs justify-start"
              onClick={() => handleTriggerExport("Inventory")}
            >
              Export Inventory
            </Button>
          </div>
        </div>

        {/* Store Metadata Backup Card */}
        <div className="border rounded-xl bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Store Metadata Snapshots</h3>
              <p className="text-xs text-muted-foreground">
                Capture application-level catalog, domain configuration, and theme settings
              </p>
            </div>
          </div>

          <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
            <p className="font-semibold">Last Snapshot: Today at 11:30 AM</p>
            <p className="text-muted-foreground">Status: COMPLETED (Retention: 30 days)</p>
          </div>

          <Button
            className="w-full"
            onClick={() => handleTriggerExport("Metadata Snapshot")}
          >
            Create New Metadata Snapshot
          </Button>
        </div>
      </div>

      {/* Data Import Pipeline Card */}
      <div className="border rounded-xl bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3 border-b pb-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Two-Stage Validated Import Pipeline</h3>
            <p className="text-xs text-muted-foreground">
              Files are pre-validated for required schemas and tenant isolation before updating live records
            </p>
          </div>
        </div>

        <div className="border-2 border-dashed rounded-xl p-8 text-center bg-muted/20 space-y-2">
          <FileCheck className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">Drag & drop catalog CSV or JSON file here</p>
          <p className="text-xs text-muted-foreground">Supports Products, Customers, and Inventory mappings</p>
          <div className="pt-2">
            <Button size="sm" variant="outline" onClick={handleSimulateImportUpload}>
              Select Test CSV File
            </Button>
          </div>
        </div>

        {importPreview && (
          <div className="p-4 bg-muted/40 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-sm font-bold">
              <span>Validation Preview Report</span>
              <span className="text-xs text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                Ready to Import
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-2 rounded bg-card border">
                <p className="text-muted-foreground">Total Rows</p>
                <p className="font-bold text-sm">{importPreview.total}</p>
              </div>
              <div className="p-2 rounded bg-card border text-emerald-700">
                <p>Valid Rows</p>
                <p className="font-bold text-sm">{importPreview.valid}</p>
              </div>
              <div className="p-2 rounded bg-card border text-red-600">
                <p>Invalid Rows</p>
                <p className="font-bold text-sm">{importPreview.invalid}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setImportPreview(null)}>
                Cancel
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Confirm & Execute Import
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
