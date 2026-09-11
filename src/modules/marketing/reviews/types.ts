import type { ProductReview, ReviewStatus, ReviewModerationAudit } from "@/database/schema";

export type { ProductReview, ReviewStatus, ReviewModerationAudit };

export interface RatingDistribution {
  averageRating: number;
  totalReviews: number;
  starCounts: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface SubmitReviewInput {
  storeId: string;
  productId: string;
  rating: number;
  title?: string;
  body: string;
  authorName: string;
  authorEmail?: string;
  customerId?: string | null;
}

export interface ModerateReviewInput {
  reviewId: string;
  action: "APPROVE" | "REJECT" | "HIDE";
  reason?: string;
}

export interface PublicReviewDTO {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  authorName: string;
  verifiedBuyer: boolean;
  createdAt: Date;
}
