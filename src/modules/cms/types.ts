import { z } from "zod";

export const CreateCmsPageSchema = z.object({
  storeId: z.string().uuid(),
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/i, "Slug must contain only letters, numbers, and hyphens"),
  contentHtml: z.string().default(""),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  author: z.string().optional(),
  language: z.string().min(2).max(10).default("en"),
});

export type CreateCmsPageInput = z.infer<typeof CreateCmsPageSchema>;

export const UpdateCmsPageSchema = z.object({
  storeId: z.string().uuid(),
  pageId: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/i).optional(),
  contentHtml: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  author: z.string().optional(),
  language: z.string().min(2).max(10).optional(),
});

export type UpdateCmsPageInput = z.infer<typeof UpdateCmsPageSchema>;

export const CreateBlogPostSchema = z.object({
  storeId: z.string().uuid(),
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/i),
  excerpt: z.string().optional(),
  contentHtml: z.string().default(""),
  featuredImageUrl: z.string().url().optional().or(z.literal("")),
  author: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  language: z.string().min(2).max(10).default("en"),
});

export type CreateBlogPostInput = z.infer<typeof CreateBlogPostSchema>;
