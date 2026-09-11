import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getStoreReviewsAction } from "@/modules/marketing/reviews/actions";
import { ReviewModerator } from "@/components/dashboard/review-moderator";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export const metadata = {
  title: "Product Reviews Moderation — STOREFY",
};

export default async function ReviewsModerationPage() {
  const ctx = await requirePermission("marketing:read");
  const reviews = await getStoreReviewsAction();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            Product Reviews & Moderation
          </h1>
          <p className="text-xs text-slate-400">
            Audit, approve, or hide customer reviews with verified buyer verification for {ctx.store.name}.
          </p>
        </div>
        <Badge variant="outline" className="border-amber-500/30 bg-amber-950/40 text-amber-300 text-[10px] w-fit">
          Social Proof Engine
        </Badge>
      </div>

      <ReviewModerator initialReviews={reviews} />
    </div>
  );
}
