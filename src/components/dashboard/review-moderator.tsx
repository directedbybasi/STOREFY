"use client";

import React, { useState } from "react";
import type { ProductReview, ReviewStatus } from "@/database/schema";
import {
  Star,
  CheckCircle2,
  XCircle,
  EyeOff,
  Search,
  Filter,
  AlertCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { moderateReviewAction } from "@/modules/marketing/reviews/actions";

interface ReviewModeratorProps {
  initialReviews: ProductReview[];
}

export function ReviewModerator({ initialReviews }: ReviewModeratorProps) {
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews);
  const [statusFilter, setStatusFilter] = useState<"ALL" | ReviewStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleModerate = async (reviewId: string, action: "APPROVE" | "REJECT" | "HIDE") => {
    try {
      setProcessingId(reviewId);
      setFeedback(null);
      const res = await moderateReviewAction({ reviewId, action });
      if (res.success && res.review) {
        setReviews((prev) =>
          prev.map((r) => (r.id === reviewId ? res.review! : r))
        );
        setFeedback(`Review ${action.toLowerCase()}d successfully.`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = reviews.filter((r) => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesSearch =
      r.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.authorEmail && r.authorEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      r.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.title && r.title.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Controls & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(["ALL", "PENDING", "APPROVED", "REJECTED", "HIDDEN"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === tab
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {tab === "ALL" && `All (${reviews.length})`}
              {tab === "PENDING" && `Pending (${pendingCount})`}
              {tab === "APPROVED" && "Approved"}
              {tab === "REJECTED" && "Rejected"}
              {tab === "HIDDEN" && "Hidden"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Reviews Cards List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-xs">
            No reviews found matching the current filter.
          </div>
        ) : (
          filtered.map((rev) => (
            <div
              key={rev.id}
              className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl shadow-sm space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${
                          s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-white text-xs">{rev.authorName}</span>
                  {rev.authorEmail && (
                    <span className="text-[11px] text-slate-500 font-mono">({rev.authorEmail})</span>
                  )}
                  {rev.verifiedBuyer && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                      ✓ Verified Buyer
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                      rev.status === "APPROVED"
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/40"
                        : rev.status === "PENDING"
                        ? "bg-amber-950/60 text-amber-300 border border-amber-800/40"
                        : rev.status === "REJECTED"
                        ? "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {rev.status}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Review Content */}
              <div className="space-y-1">
                {rev.title && <h4 className="text-xs font-bold text-slate-200">{rev.title}</h4>}
                <p className="text-xs text-slate-300 leading-relaxed">{rev.body}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">
                  Product ID: {rev.productId}
                </span>

                <div className="flex items-center gap-2">
                  {rev.status !== "APPROVED" && (
                    <button
                      type="button"
                      disabled={processingId === rev.id}
                      onClick={() => handleModerate(rev.id, "APPROVE")}
                      className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition disabled:opacity-40"
                    >
                      Approve
                    </button>
                  )}
                  {rev.status !== "REJECTED" && (
                    <button
                      type="button"
                      disabled={processingId === rev.id}
                      onClick={() => handleModerate(rev.id, "REJECT")}
                      className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium transition disabled:opacity-40"
                    >
                      Reject
                    </button>
                  )}
                  {rev.status !== "HIDDEN" && (
                    <button
                      type="button"
                      disabled={processingId === rev.id}
                      onClick={() => handleModerate(rev.id, "HIDE")}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition disabled:opacity-40"
                    >
                      Hide
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
