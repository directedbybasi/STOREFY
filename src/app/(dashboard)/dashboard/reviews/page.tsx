import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getStoreReviewsAction } from "@/modules/marketing/reviews/actions";
import { ReviewModerator } from "@/components/dashboard/review-moderator";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Product Reviews — STOREFY",
};

export default async function ReviewsModerationPage() {
  const ctx = await requirePermission("marketing:read");
  const reviews = await getStoreReviewsAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Reviews & Ratings"
        description={`Audit, moderate, and feature verified buyer reviews for ${ctx.store.name}.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Marketing", href: "/dashboard/marketing" },
          { label: "Reviews" },
        ]}
      />

      <ReviewModerator initialReviews={reviews} />
    </div>
  );
}
