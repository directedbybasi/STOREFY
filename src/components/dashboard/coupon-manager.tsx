"use client";

import React, { useState } from "react";
import type { Coupon } from "@/database/schema";
import { formatPaiseToRupees } from "@/lib/currency";
import {
  Tag,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
  Filter,
  AlertCircle,
  Copy,
  Percent,
  IndianRupee,
  Gift,
  Truck,
} from "lucide-react";
import { createCouponAction, toggleCouponStatusAction } from "@/modules/marketing/coupons/actions";
import type { CreateCouponInput } from "@/modules/marketing/coupons/validation";

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
    value: 10, // Percentage or Rupees
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

      // Convert rupees to paise for money fields
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
        setFeedback({ type: "success", message: `Coupon '${res.coupon.code}' created successfully!` });
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
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search coupons by code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>{isCreateOpen ? "Close Form" : "Create Coupon"}</span>
        </button>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Coupon Collapsible Form */}
      {isCreateOpen && (
        <div className="p-6 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Tag className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Create New Promotional Coupon</h2>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SUMMER25"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Discount Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT" | "BOGO" | "FREE_SHIPPING" })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                >
                  <option value="PERCENTAGE">Percentage (%) Off</option>
                  <option value="FIXED_AMOUNT">Flat Amount (₹) Off</option>
                  <option value="BOGO">Buy One Get One (BOGO)</option>
                  <option value="FREE_SHIPPING">Free Shipping</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {formData.type === "PERCENTAGE"
                    ? "Percentage Value (%)"
                    : formData.type === "FIXED_AMOUNT"
                    ? "Discount Value (₹)"
                    : "Value"}
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={formData.type === "FREE_SHIPPING" || formData.type === "BOGO"}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Min Spend Threshold (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 999"
                  value={formData.minSpendRupees || ""}
                  onChange={(e) => setFormData({ ...formData, minSpendRupees: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Max Discount Cap (₹, Optional)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500"
                  disabled={formData.type !== "PERCENTAGE"}
                  value={formData.maxDiscountRupees || ""}
                  onChange={(e) => setFormData({ ...formData, maxDiscountRupees: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Global Usage Limit (Blank = Unlimited)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Per-Customer Limit</label>
                <input
                  type="number"
                  min="1"
                  value={formData.perCustomerLimit}
                  onChange={(e) => setFormData({ ...formData, perCustomerLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Start Date (Optional)</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Description (Internal Notes)</label>
              <input
                type="text"
                placeholder="e.g. 10% off launch promo code"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.code.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Save Coupon"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Coupons Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Type & Value</th>
                <th className="px-5 py-3">Min Spend</th>
                <th className="px-5 py-3">Usage</th>
                <th className="px-5 py-3">Validity</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    No coupons found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isExpired = c.endDate && new Date(c.endDate) < new Date();
                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{c.code}</span>
                        </div>
                        {c.description && (
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">{c.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-white">
                          {c.type === "PERCENTAGE" && `${c.value}% Off`}
                          {c.type === "FIXED_AMOUNT" && `${formatPaiseToRupees(c.value)} Off`}
                          {c.type === "BOGO" && "Buy 1 Get 1"}
                          {c.type === "FREE_SHIPPING" && "Free Shipping"}
                        </span>
                        {c.maxDiscountAmount && (
                          <p className="text-[10px] text-slate-500">
                            Cap: {formatPaiseToRupees(c.maxDiscountAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {c.minSpendAmount > 0 ? formatPaiseToRupees(c.minSpendAmount) : "None"}
                      </td>
                      <td className="px-5 py-3.5 font-mono">
                        {c.usageCount} / {c.usageLimit !== null ? c.usageLimit : "∞"}
                      </td>
                      <td className="px-5 py-3.5 text-[11px]">
                        {c.endDate ? (
                          <span className={isExpired ? "text-rose-400" : "text-slate-400"}>
                            {isExpired ? "Expired: " : "Ends: "}
                            {new Date(c.endDate).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-500">No expiration</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.isActive && !isExpired
                              ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          }`}
                        >
                          {c.isActive && !isExpired ? "Active" : isExpired ? "Expired" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          className="text-xs text-slate-400 hover:text-white transition underline"
                        >
                          {c.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
