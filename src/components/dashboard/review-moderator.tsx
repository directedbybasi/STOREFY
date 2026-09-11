"use client";

import React, { useState } from "react";
import type { ProductReview, ReviewStatus } from "@/database/schema";
import {
  Star,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { moderateReviewAction } from "@/modules/marketing/reviews/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

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
    <div className="space-y-4">
      {/* Controls & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border">
          {(["ALL", "PENDING", "APPROVED", "REJECTED", "HIDDEN"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                statusFilter === tab
                  ? "bg-card text-foreground shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
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
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 text-xs"
          />
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-700 dark:text-emerald-400 text-xs flex items-center justify-between">
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Reviews Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              title="No reviews found"
              description="No customer reviews matched your search or status filter."
            />
          </Card>
        ) : (
          filtered.map((rev) => (
            <Card key={rev.id} className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${
                          s <= rev.rating ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-semibold text-foreground text-xs">{rev.authorName}</span>
                  {rev.authorEmail && (
                    <span className="text-[11px] text-muted-foreground font-mono">({rev.authorEmail})</span>
                  )}
                  {rev.verifiedBuyer && (
                    <Badge variant="success" dot className="text-[10px]">
                      Verified Buyer
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      rev.status === "APPROVED"
                        ? "success"
                        : rev.status === "PENDING"
                        ? "warning"
                        : rev.status === "REJECTED"
                        ? "error"
                        : "neutral"
                    }
                    dot
                  >
                    {rev.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-tabular">
                    {new Date(rev.createdAt).toLocaleDateString("en-IN", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Review Content */}
              <div className="space-y-0.5">
                {rev.title && <h4 className="text-xs font-semibold text-foreground">{rev.title}</h4>}
                <p className="text-xs text-muted-foreground leading-relaxed">{rev.body}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2.5 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">
                  Product ID: {rev.productId}
                </span>

                <div className="flex items-center gap-1.5">
                  {rev.status !== "APPROVED" && (
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={processingId === rev.id}
                      onClick={() => handleModerate(rev.id, "APPROVE")}
                    >
                      Approve
                    </Button>
                  )}
                  {rev.status !== "REJECTED" && (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={processingId === rev.id}
                      onClick={() => handleModerate(rev.id, "REJECT")}
                    >
                      Reject
                    </Button>
                  )}
                  {rev.status !== "HIDDEN" && (
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={processingId === rev.id}
                      onClick={() => handleModerate(rev.id, "HIDE")}
                    >
                      Hide
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
