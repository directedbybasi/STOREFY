"use client";

import React, { useState } from "react";
import {
  Building2,
  Users,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function B2bPage() {
  const [activeTab, setActiveTab] = useState<"companies" | "pricelists" | "approvals">("companies");

  const [companies] = useState([
    {
      id: "b2b-1",
      name: "Apex Retailers Ltd.",
      code: "APEX-IN",
      taxId: "29AABCU9603R1ZM",
      paymentTerms: "NET_30",
      creditLimitPaise: 50000000,
      status: "ACTIVE",
    },
    {
      id: "b2b-2",
      name: "Heritage Handicrafts Emporium",
      code: "HERITAGE-EXP",
      taxId: "07AAACR4412E1ZZ",
      paymentTerms: "NET_15",
      creditLimitPaise: 25000000,
      status: "ACTIVE",
    },
    {
      id: "b2b-3",
      name: "Global Boutiques Dubai",
      code: "GB-UAE",
      taxId: "TRN-10029384",
      paymentTerms: "PREPAID",
      creditLimitPaise: 10000000,
      status: "ACTIVE",
    },
  ]);

  const [approvals, setApprovals] = useState([
    {
      id: "ord-b2b-1",
      companyName: "Apex Retailers Ltd.",
      poNumber: "PO-2026-0901",
      itemsCount: 150,
      totalAmountPaise: 14500000, // ₹1,45,000
      paymentTerms: "NET_30",
      status: "SUBMITTED",
      submittedAt: "10 mins ago",
    },
    {
      id: "ord-b2b-2",
      companyName: "Heritage Handicrafts Emporium",
      poNumber: "PO-HH-449",
      itemsCount: 40,
      totalAmountPaise: 4800000, // ₹48,000
      paymentTerms: "NET_15",
      status: "SUBMITTED",
      submittedAt: "2 hours ago",
    },
  ]);

  const handleApprove = (id: string) => {
    setApprovals((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "APPROVED" } : o))
    );
  };

  const handleReject = (id: string) => {
    setApprovals((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "REJECTED" } : o))
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">B2B & Wholesale Commerce</h1>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded-full">
              Phase 16 Wholesale
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage wholesale companies, custom price lists, and order approvals
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add B2B Company
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("companies")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "companies"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="w-4 h-4" /> Companies ({companies.length})
        </button>
        <button
          onClick={() => setActiveTab("approvals")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "approvals"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" /> Order Approvals ({approvals.filter((a) => a.status === "SUBMITTED").length})
        </button>
        <button
          onClick={() => setActiveTab("pricelists")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "pricelists"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag className="w-4 h-4" /> Price Lists (2)
        </button>
      </div>

      {/* Tab: Companies */}
      {activeTab === "companies" && (
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Registered Wholesale Companies</h3>
          </div>
          <div className="divide-y text-sm">
            {companies.map((c) => (
              <div key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{c.name}</span>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Tax ID / GSTIN: {c.taxId}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Payment Terms</p>
                    <span className="font-semibold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {c.paymentTerms}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Credit Limit</p>
                    <p className="font-bold">₹{(c.creditLimitPaise / 100).toLocaleString()}</p>
                  </div>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-1 rounded">
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Order Approvals */}
      {activeTab === "approvals" && (
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Pending Wholesale Purchase Orders</h3>
          </div>
          <div className="divide-y text-sm">
            {approvals.map((o) => (
              <div key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{o.companyName}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      PO #{o.poNumber}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {o.itemsCount} units • Terms: {o.paymentTerms} • {o.submittedAt}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-base">
                    ₹{(o.totalAmountPaise / 100).toLocaleString()}
                  </span>
                  {o.status === "SUBMITTED" ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleReject(o.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleApprove(o.id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Approve Order
                      </Button>
                    </div>
                  ) : (
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        o.status === "APPROVED"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {o.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Price Lists */}
      {activeTab === "pricelists" && (
        <div className="border rounded-xl bg-card p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base">Volume Tier Price Overrides</h3>
              <p className="text-xs text-muted-foreground">
                Configured wholesale pricing applied automatically during bulk order calculation
              </p>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" /> New Price List
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold">Apex Tier 1 Wholesale</span>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">PL-APEX-1</span>
              </div>
              <p className="text-xs text-muted-foreground">Applies to Apex Retailers Ltd.</p>
              <div className="text-xs pt-2 border-t space-y-1">
                <p>• Silk Kurtas: 50+ units @ ₹1,799 (Retail: ₹2,499)</p>
                <p>• Leather Wallets: 100+ units @ ₹899 (Retail: ₹1,299)</p>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold">Global Export Tier</span>
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">PL-GLOB-EXP</span>
              </div>
              <p className="text-xs text-muted-foreground">Applies to Overseas Accounts</p>
              <div className="text-xs pt-2 border-t space-y-1">
                <p>• Pashminas: 25+ units @ ₹2,200 (Retail: ₹3,499)</p>
                <p>• Cotton Tees: 200+ units @ ₹450 (Retail: ₹799)</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
