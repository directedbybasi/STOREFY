"use client";

import React, { useState } from "react";
import type { Coupon } from "@/database/schema";
import { formatPaiseToRupees } from "@/lib/currency";
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { createCouponAction, toggleCouponStatusAction } from "@/modules/marketing/coupons/actions";
import type { CreateCouponInput } from "@/modules/marketing/coupons/validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

interface CouponManagerProps {
  initialCoupons: Coupon[];
  storeCurrency: string;
}

export function CouponManager({ initialCoupons, storeCurrency }: CouponManagerProps) {
  const [couponsList, setCouponsList] = useState<Coupon[]>(initialCoupons);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_SHIPPING",
    value: 10,
    minSpendRupees: 0,
    maxDiscountRupees: 0,
    usageLimit: "",
    perCustomerLimit: 1,
    startDate: "",
    endDate: "",
    description: "",
    isActive: true,
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFeedback(null);

      const valuePaise = formData.type === "FIXED_AMOUNT" ? Math.round(formData.value * 100) : formData.value;
      const minSpendPaise = Math.round((Number(formData.minSpendRupees) || 0) * 100);
      const maxDiscountPaise = formData.maxDiscountRupees ? Math.round(Number(formData.maxDiscountRupees) * 100) : null;

      const input: CreateCouponInput = {
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        value: valuePaise,
        minSpendAmount: minSpendPaise,
        maxDiscountAmount: maxDiscountPaise,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
        perCustomerLimit: Number(formData.perCustomerLimit) || 1,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
        targetType: "ALL",
        targetIds: [],
        bogoConfig: formData.type === "BOGO" ? { buyQuantity: 1, getQuantity: 1 } : null,
      };

      const res = await createCouponAction(input);
      if (res.success && res.coupon) {
        setCouponsList([res.coupon, ...couponsList]);
        setFeedback({ type: "success", message: `Coupon '${res.coupon.code}' created successfully.` });
        setIsCreateOpen(false);
        setFormData({
          code: "",
          type: "PERCENTAGE",
          value: 10,
          minSpendRupees: 0,
          maxDiscountRupees: 0,
          usageLimit: "",
          perCustomerLimit: 1,
          startDate: "",
          endDate: "",
          description: "",
          isActive: true,
        });
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to create coupon." });
      }
    } catch {
      setFeedback({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    const nextState = !coupon.isActive;
    try {
      const res = await toggleCouponStatusAction(coupon.id, nextState);
      if (res.success) {
        setCouponsList((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: nextState } : c))
        );
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to update status." });
    }
  };

  // Filtering
  const filtered = couponsList.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && c.isActive) ||
      (statusFilter === "INACTIVE" && !c.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search coupons by code or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active only</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          variant={isCreateOpen ? "outline" : "default"}
        >
          {isCreateOpen ? (
            <>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Close Form
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Coupon
            </>
          )}
        </Button>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Coupon Card */}
      {isCreateOpen && (
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm">Create New Promotional Coupon</CardTitle>
            <CardDescription>
              Configure code, discount structure, minimum spend, and redemption limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">Coupon Code *</label>
                  <Input
                    required
                    placeholder="e.g. FESTIVE20"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="font-mono uppercase text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">Discount Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        type: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_SHIPPING",
                      })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="PERCENTAGE">Percentage (%) Off</option>
                    <option value="FIXED_AMOUNT">Flat Amount (₹) Off</option>
                    <option value="BOGO">Buy One Get One (BOGO)</option>
                    <option value="FREE_SHIPPING">Free Shipping</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">
                    {formData.type === "PERCENTAGE"
                      ? "Percentage Value (%)"
                      : formData.type === "FIXED_AMOUNT"
                      ? "Discount Value (₹)"
                      : "Value"}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    disabled={formData.type === "FREE_SHIPPING" || formData.type === "BOGO"}
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">Min Spend Threshold (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 999"
                    value={formData.minSpendRupees || ""}
                    onChange={(e) => setFormData({ ...formData, minSpendRupees: Number(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">Max Discount Cap (₹, Optional)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    disabled={formData.type !== "PERCENTAGE"}
                    value={formData.maxDiscountRupees || ""}
                    onChange={(e) => setFormData({ ...formData, maxDiscountRupees: Number(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">Usage Limit (Blank = Unlimited)</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 100"
                    value={formData.usageLimit}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">Per-Customer Limit</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.perCustomerLimit}
                    onChange={(e) => setFormData({ ...formData, perCustomerLimit: Number(e.target.value) })}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-foreground">End Date</label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-foreground">Internal Notes (Optional)</label>
                <Input
                  placeholder="e.g. Launch campaign promotion"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !formData.code.trim()}
                >
                  {isSubmitting ? "Saving..." : "Save Coupon"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Coupons Table */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="No coupons found"
            description="Create your first promotional discount code to incentivize customer checkouts."
            action={{
              label: "Create Coupon",
              onClick: () => setIsCreateOpen(true),
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type & Value</TableHead>
                <TableHead>Min Spend</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const isExpired = c.endDate && new Date(c.endDate) < new Date();
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-mono font-semibold text-foreground">
                        <Tag className="h-3 w-3 text-primary" />
                        <span>{c.code}</span>
                      </div>
                      {c.description && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-xs">{c.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">
                        {c.type === "PERCENTAGE" && `${c.value}% Off`}
                        {c.type === "FIXED_AMOUNT" && `${formatPaiseToRupees(c.value)} Off`}
                        {c.type === "BOGO" && "Buy 1 Get 1"}
                        {c.type === "FREE_SHIPPING" && "Free Shipping"}
                      </span>
                      {c.maxDiscountAmount && (
                        <p className="text-[10px] text-muted-foreground font-tabular">
                          Cap: {formatPaiseToRupees(c.maxDiscountAmount)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="font-tabular">
                      {c.minSpendAmount > 0 ? formatPaiseToRupees(c.minSpendAmount) : "None"}
                    </TableCell>
                    <TableCell className="font-tabular font-mono">
                      {c.usageCount} / {c.usageLimit !== null ? c.usageLimit : "∞"}
                    </TableCell>
                    <TableCell className="text-[11px] font-tabular">
                      {c.endDate ? (
                        <span className={isExpired ? "text-destructive" : "text-muted-foreground"}>
                          {isExpired ? "Expired: " : "Ends: "}
                          {new Date(c.endDate).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No expiration</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.isActive && !isExpired ? "success" : isExpired ? "error" : "neutral"}
                        dot
                      >
                        {c.isActive && !isExpired ? "Active" : isExpired ? "Expired" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleToggleStatus(c)}
                      >
                        {c.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
