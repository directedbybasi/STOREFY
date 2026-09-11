"use client";

import React, { useState } from "react";
import {
  Building2,
  Tag,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function B2bPage() {
  const [activeTab, setActiveTab] = useState<"companies" | "approvals" | "pricelists">("companies");

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
      totalAmountPaise: 14500000,
      paymentTerms: "NET_30",
      status: "SUBMITTED",
      submittedAt: "10 mins ago",
    },
    {
      id: "ord-b2b-2",
      companyName: "Heritage Handicrafts Emporium",
      poNumber: "PO-HH-449",
      itemsCount: 40,
      totalAmountPaise: 4800000,
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

  const pendingApprovalsCount = approvals.filter((a) => a.status === "SUBMITTED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="B2B & Wholesale Commerce"
        description="Manage corporate accounts, wholesale tiers, volume pricing, and purchase order approvals."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "B2B Wholesale" },
        ]}
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add B2B Company
          </Button>
        }
      />

      {/* Segment Navigation */}
      <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border">
        <button
          type="button"
          onClick={() => setActiveTab("companies")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "companies"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Companies ({companies.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("approvals")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "approvals"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Approvals ({pendingApprovalsCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("pricelists")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "pricelists"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Price Lists (2)</span>
        </button>
      </div>

      {/* Tab: Companies */}
      {activeTab === "companies" && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Tax ID / GSTIN</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Credit Limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium text-foreground text-xs">{c.name}</div>
                    <span className="font-mono text-[10px] text-muted-foreground">{c.code}</span>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.taxId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {c.paymentTerms}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-tabular font-medium text-foreground">
                    ₹{(c.creditLimitPaise / 100).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" dot>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="xs">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Tab: Order Approvals */}
      {activeTab === "approvals" && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number & Buyer</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <div className="font-medium text-foreground text-xs">{o.companyName}</div>
                    <span className="font-mono text-[10px] text-muted-foreground">{o.poNumber}</span>
                  </TableCell>
                  <TableCell className="font-tabular text-muted-foreground">
                    {o.itemsCount} units
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {o.paymentTerms}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-tabular font-semibold text-foreground">
                    ₹{(o.totalAmountPaise / 100).toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.submittedAt}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        o.status === "APPROVED"
                          ? "success"
                          : o.status === "SUBMITTED"
                          ? "warning"
                          : "error"
                      }
                      dot
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {o.status === "SUBMITTED" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleReject(o.id)}
                        >
                          Reject
                        </Button>
                        <Button
                          size="xs"
                          onClick={() => handleApprove(o.id)}
                        >
                          Approve
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Processed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Tab: Price Lists */}
      {activeTab === "pricelists" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Volume Tier Price Schedules</h3>
              <p className="text-xs text-muted-foreground">
                Automatic tiered wholesale pricing applied during purchase order processing.
              </p>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> New Price List
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Apex Tier 1 Wholesale</h4>
                  <p className="text-[11px] text-muted-foreground">Assigned to: Apex Retailers Ltd.</p>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">PL-APEX-1</Badge>
              </div>
              <div className="text-xs pt-2 border-t border-border space-y-1.5 text-muted-foreground font-tabular">
                <div className="flex justify-between">
                  <span>Silk Kurtas (50+ units)</span>
                  <span className="font-semibold text-foreground">₹1,799 (Retail: ₹2,499)</span>
                </div>
                <div className="flex justify-between">
                  <span>Leather Wallets (100+ units)</span>
                  <span className="font-semibold text-foreground">₹899 (Retail: ₹1,299)</span>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground">Global Export Tier</h4>
                  <p className="text-[11px] text-muted-foreground">Assigned to: Overseas Accounts</p>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px]">PL-GLOB-EXP</Badge>
              </div>
              <div className="text-xs pt-2 border-t border-border space-y-1.5 text-muted-foreground font-tabular">
                <div className="flex justify-between">
                  <span>Pashminas (25+ units)</span>
                  <span className="font-semibold text-foreground">₹2,200 (Retail: ₹3,499)</span>
                </div>
                <div className="flex justify-between">
                  <span>Cotton Tees (200+ units)</span>
                  <span className="font-semibold text-foreground">₹450 (Retail: ₹799)</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
