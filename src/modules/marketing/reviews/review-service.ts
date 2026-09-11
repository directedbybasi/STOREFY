import { db } from "@/database/client";
import {
  productReviews,
  reviewModerationAudit,
  products,
  orders,
  orderItems,
  type ProductReview,
  type ReviewStatus,
} from "@/database/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { ValidationError, NotFoundError, ConflictError } from "@/core/errors";
import type {
  SubmitReviewInput,
  ModerateReviewInput,
  RatingDistribution,
  PublicReviewDTO,
} from "./types";

/**
 * Formats an author name safely for public display: e.g. "Aarav Sharma" -> "Aarav S."
 */
export function formatSafeAuthorName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || "Verified Customer";
  const first = parts[0];
  const lastInitial = parts[parts.length - 1]?.[0]?.toUpperCase();
  return `${first} ${lastInitial}.`;
}

/**
 * Submits a new product review with strict verified-buyer verification and duplicate prevention.
 */
export async function submitProductReview(
  input: SubmitReviewInput
): Promise<ProductReview> {
  const { storeId, productId, rating, title, body, authorName, authorEmail, customerId } = input;

  // 1. Validate rating range (1-5)
  if (rating < 1 || rating > 5) {
    throw new ValidationError("Rating must be between 1 and 5 stars.");
  }

  // 2. Validate product exists in this store
  const [product] = await db
    .select({ id: products.id, title: products.title })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    .limit(1);

  if (!product) {
    throw new NotFoundError("Product not found in this store.");
  }

  // 3. Duplicate review prevention (customer + product or email + product)
  if (customerId) {
    const [existing] = await db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.storeId, storeId),
          eq(productReviews.customerId, customerId),
          eq(productReviews.productId, productId)
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError("You have already submitted a review for this product.");
    }
  } else if (authorEmail) {
    const [existing] = await db
      .select({ id: productReviews.id })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.storeId, storeId),
          eq(productReviews.authorEmail, authorEmail.toLowerCase().trim()),
          eq(productReviews.productId, productId)
        )
      )
      .limit(1);

    if (existing) {
      throw new ConflictError("A review from this email address already exists for this product.");
    }
  }

  // 4. Server-authoritative verified buyer determination
  // Check if customer or email has a confirmed/delivered order containing this product
  let verifiedBuyer = false;
  let matchingOrderId: string | null = null;
  let matchingOrderItemId: string | null = null;

  const orderCondition = customerId
    ? eq(orders.customerId, customerId)
    : authorEmail
    ? sql`LOWER(${orders.customerSnapshot}->>'email') = ${authorEmail.toLowerCase().trim()}`
    : null;

  if (orderCondition) {
    const matchingPurchases = await db
      .select({
        orderId: orders.id,
        orderItemId: orderItems.id,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.storeId, storeId),
          orderCondition,
          eq(orderItems.productId, productId),
          sql`${orders.status} != 'CANCELLED'`
        )
      )
      .limit(1);

    if (matchingPurchases.length > 0 && matchingPurchases[0]) {
      verifiedBuyer = true;
      matchingOrderId = matchingPurchases[0].orderId;
      matchingOrderItemId = matchingPurchases[0].orderItemId;
    }
  }

  // 5. Insert review in PENDING moderation status
  const safeName = formatSafeAuthorName(authorName);
  const [createdReview] = await db
    .insert(productReviews)
    .values({
      storeId,
      productId,
      customerId: customerId || null,
      orderId: matchingOrderId,
      orderItemId: matchingOrderItemId,
      rating,
      title: title ? title.trim() : null,
      body: body.trim(),
      authorName: safeName,
      authorEmail: authorEmail ? authorEmail.toLowerCase().trim() : null,
      verifiedBuyer,
      status: "PENDING",
    })
    .returning();

  return createdReview;
}

/**
 * Moderates a customer review (APPROVE, REJECT, HIDE) with an immutable audit log.
 */
export async function moderateReview(
  storeId: string,
  moderatorUserId: string | null,
  input: ModerateReviewInput
): Promise<ProductReview> {
  const { reviewId, action, reason } = input;

  const [review] = await db
    .select()
    .from(productReviews)
    .where(and(eq(productReviews.id, reviewId), eq(productReviews.storeId, storeId)))
    .limit(1);

  if (!review) {
    throw new NotFoundError("Review not found in this store.");
  }

  let newStatus: ReviewStatus;
  switch (action) {
    case "APPROVE":
      newStatus = "APPROVED";
      break;
    case "REJECT":
      newStatus = "REJECTED";
      break;
    case "HIDE":
      newStatus = "HIDDEN";
      break;
    default:
      throw new ValidationError("Invalid moderation action.");
  }

  // Update review status
  const [updated] = await db
    .update(productReviews)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(productReviews.id, reviewId))
    .returning();

  // Append immutable moderation audit entry
  await db.insert(reviewModerationAudit).values({
    storeId,
    reviewId,
    moderatorUserId: moderatorUserId || null,
    action,
    previousStatus: review.status,
    newStatus,
    reason: reason || null,
  });

  return updated;
}

/**
 * Computes server-authoritative rating distribution for approved reviews.
 */
export async function getProductRatingDistribution(
  storeId: string,
  productId: string
): Promise<RatingDistribution> {
  const rows = await db
    .select({
      rating: productReviews.rating,
      count: sql<number>`count(*)::int`,
    })
    .from(productReviews)
    .where(
      and(
        eq(productReviews.storeId, storeId),
        eq(productReviews.productId, productId),
        eq(productReviews.status, "APPROVED")
      )
    )
    .groupBy(productReviews.rating);

  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalScore = 0;
  let totalReviews = 0;

  for (const row of rows) {
    const r = row.rating;
    if (r >= 1 && r <= 5) {
      starCounts[r] = (starCounts[r] || 0) + row.count;
      totalScore += r * row.count;
      totalReviews += row.count;
    }
  }

  const averageRating = totalReviews > 0 ? Number((totalScore / totalReviews).toFixed(1)) : 0;

  return {
    averageRating,
    totalReviews,
    starCounts: starCounts as RatingDistribution["starCounts"],
  };
}

/**
 * Returns public approved reviews for storefront PDP display with customer privacy preserved.
 */
export async function getApprovedProductReviews(
  storeId: string,
  productId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ reviews: PublicReviewDTO[]; total: number }> {
  const limit = Math.min(50, options.limit || 10);
  const offset = options.offset || 0;

  const rawReviews = await db
    .select({
      id: productReviews.id,
      rating: productReviews.rating,
      title: productReviews.title,
      body: productReviews.body,
      authorName: productReviews.authorName,
      verifiedBuyer: productReviews.verifiedBuyer,
      createdAt: productReviews.createdAt,
    })
    .from(productReviews)
    .where(
      and(
        eq(productReviews.storeId, storeId),
        eq(productReviews.productId, productId),
        eq(productReviews.status, "APPROVED")
      )
    )
    .orderBy(desc(productReviews.createdAt))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productReviews)
    .where(
      and(
        eq(productReviews.storeId, storeId),
        eq(productReviews.productId, productId),
        eq(productReviews.status, "APPROVED")
      )
    );

  return {
    reviews: rawReviews,
    total: countResult?.count || 0,
  };
}

/**
 * Lists all reviews for merchant review moderation desk.
 */
export async function listStoreReviewsForMerchant(
  storeId: string,
  statusFilter?: ReviewStatus
): Promise<ProductReview[]> {
  const conditions = [eq(productReviews.storeId, storeId)];
  if (statusFilter) {
    conditions.push(eq(productReviews.status, statusFilter));
  }

  return await db
    .select()
    .from(productReviews)
    .where(and(...conditions))
    .orderBy(desc(productReviews.createdAt));
}
