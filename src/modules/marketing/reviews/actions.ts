"use server";

import { requirePermission } from "@/core/tenant/rbac";
import {
  submitProductReview,
  moderateReview,
  listStoreReviewsForMerchant,
  getProductRatingDistribution,
  getApprovedProductReviews,
} from "./review-service";
import {
  submitReviewSchema,
  moderateReviewSchema,
  type SubmitReviewFormData,
  type ModerateReviewFormData,
} from "./validation";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import type { ProductReview, RatingDistribution, PublicReviewDTO } from "./types";

/**
 * Storefront Action: Customer submits product review.
 */
export async function submitProductReviewAction(
  domain: string,
  input: SubmitReviewFormData
): Promise<{ success: boolean; review?: ProductReview; error?: string }> {
  try {
    const resolution = await resolveStorefrontTenant(domain);
    if (resolution.status !== "ACTIVE") {
      return { success: false, error: "Store is currently unavailable." };
    }

    const parsed = submitReviewSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed." };
    }

    const review = await submitProductReview({
      storeId: resolution.store.id,
      productId: parsed.data.productId,
      rating: parsed.data.rating,
      title: parsed.data.title,
      body: parsed.data.body,
      authorName: parsed.data.authorName,
      authorEmail: parsed.data.authorEmail,
    });

    return { success: true, review };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to submit review.";
    return { success: false, error: message };
  }
}

/**
 * Storefront Action: Fetch approved reviews & rating breakdown for PDP.
 */
export async function getProductReviewsSummaryAction(
  domain: string,
  productId: string
): Promise<{
  distribution: RatingDistribution;
  reviews: PublicReviewDTO[];
  total: number;
}> {
  const resolution = await resolveStorefrontTenant(domain);
  if (resolution.status !== "ACTIVE") {
    return {
      distribution: { averageRating: 0, totalReviews: 0, starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      reviews: [],
      total: 0,
    };
  }

  const [distribution, reviewsData] = await Promise.all([
    getProductRatingDistribution(resolution.store.id, productId),
    getApprovedProductReviews(resolution.store.id, productId, { limit: 10 }),
  ]);

  return {
    distribution,
    reviews: reviewsData.reviews,
    total: reviewsData.total,
  };
}

/**
 * Merchant Action: List store reviews with optional status filter.
 */
export async function getStoreReviewsAction(
  statusFilter?: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN"
): Promise<ProductReview[]> {
  const ctx = await requirePermission("marketing:read");
  return await listStoreReviewsForMerchant(ctx.store.id, statusFilter);
}

/**
 * Merchant Action: Approve, reject, or hide a review.
 */
export async function moderateReviewAction(
  input: ModerateReviewFormData
): Promise<{ success: boolean; review?: ProductReview; error?: string }> {
  try {
    const ctx = await requirePermission("marketing:write");
    const parsed = moderateReviewSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed." };
    }

    const updated = await moderateReview(ctx.store.id, ctx.user.id, {
      reviewId: parsed.data.reviewId,
      action: parsed.data.action,
      reason: parsed.data.reason,
    });

    return { success: true, review: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to moderate review.";
    return { success: false, error: message };
  }
}
