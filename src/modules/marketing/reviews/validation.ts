import { z } from "zod";

export const submitReviewSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  rating: z
    .number()
    .int("Rating must be an integer")
    .min(1, "Rating must be at least 1 star")
    .max(5, "Rating cannot exceed 5 stars"),
  title: z.string().max(255).optional(),
  body: z
    .string()
    .min(5, "Review body must be at least 5 characters")
    .max(2000, "Review body cannot exceed 2000 characters"),
  authorName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters")
    .transform((n) => n.trim()),
  authorEmail: z.string().email("Invalid email address").optional(),
});

export const moderateReviewSchema = z.object({
  reviewId: z.string().uuid("Invalid review ID"),
  action: z.enum(["APPROVE", "REJECT", "HIDE"]),
  reason: z.string().max(500).optional(),
});

export type SubmitReviewFormData = z.infer<typeof submitReviewSchema>;
export type ModerateReviewFormData = z.infer<typeof moderateReviewSchema>;
