import { db } from "@/database/client";
import { cmsPages, blogPosts, type CmsPage, type BlogPost } from "@/database/schema";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError } from "@/core/errors";
import { recordAuditLog } from "../audit/audit-service";
import type { CreateCmsPageInput, UpdateCmsPageInput, CreateBlogPostInput } from "./types";

/**
 * Strips executable scripts and dangerous event handlers from HTML content to prevent XSS.
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return "";
  return dirtyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/\bon\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\bon\w+\s*=\s*[^"'\s>]+/gi, "")
    .replace(/javascript:[^"']*/gi, "");
}

/**
 * Creates a CMS page.
 */
export async function createPage(
  input: CreateCmsPageInput,
  actorUserId?: string
): Promise<CmsPage> {
  const sanitizedContent = sanitizeHtml(input.contentHtml);

  const [page] = await db
    .insert(cmsPages)
    .values({
      storeId: input.storeId,
      title: input.title,
      slug: input.slug.toLowerCase(),
      contentHtml: sanitizedContent,
      seoTitle: input.seoTitle || input.title,
      seoDescription: input.seoDescription,
      status: input.status,
      author: input.author,
      language: input.language.toLowerCase(),
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "cms:create_page",
      entity: "cms_page",
      entityId: page.id,
      after: { title: page.title, slug: page.slug, status: page.status },
    });
  }

  return page;
}

/**
 * Updates an existing CMS page.
 */
export async function updatePage(
  input: UpdateCmsPageInput,
  actorUserId?: string
): Promise<CmsPage> {
  const [existing] = await db
    .select()
    .from(cmsPages)
    .where(
      and(
        eq(cmsPages.storeId, input.storeId),
        eq(cmsPages.id, input.pageId)
      )
    )
    .limit(1);

  if (!existing) {
    throw new NotFoundError("CMS Page not found");
  }

  const updateData: Partial<typeof cmsPages.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.slug !== undefined) updateData.slug = input.slug.toLowerCase();
  if (input.contentHtml !== undefined)
    updateData.contentHtml = sanitizeHtml(input.contentHtml);
  if (input.seoTitle !== undefined) updateData.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined)
    updateData.seoDescription = input.seoDescription;
  if (input.status !== undefined) {
    updateData.status = input.status;
    if (input.status === "PUBLISHED" && !existing.publishedAt) {
      updateData.publishedAt = new Date();
    }
  }
  if (input.author !== undefined) updateData.author = input.author;
  if (input.language !== undefined) updateData.language = input.language.toLowerCase();

  const [updated] = await db
    .update(cmsPages)
    .set(updateData)
    .where(eq(cmsPages.id, existing.id))
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "cms:update_page",
      entity: "cms_page",
      entityId: updated.id,
      after: { status: updated.status },
    });
  }

  return updated;
}

/**
 * Retrieves a CMS page by slug.
 */
export async function getPageBySlug(
  storeId: string,
  slug: string,
  language = "en",
  onlyPublished = true
): Promise<CmsPage | null> {
  const conditions = [
    eq(cmsPages.storeId, storeId),
    eq(cmsPages.slug, slug.toLowerCase()),
    eq(cmsPages.language, language.toLowerCase()),
  ];

  if (onlyPublished) {
    conditions.push(eq(cmsPages.status, "PUBLISHED"));
  }

  const [page] = await db
    .select()
    .from(cmsPages)
    .where(and(...conditions))
    .limit(1);

  return page || null;
}

/**
 * Lists all pages for a store.
 */
export async function listPages(storeId: string): Promise<CmsPage[]> {
  return await db
    .select()
    .from(cmsPages)
    .where(eq(cmsPages.storeId, storeId))
    .orderBy(desc(cmsPages.createdAt));
}

/**
 * Creates a merchant blog post.
 */
export async function createBlogPost(
  input: CreateBlogPostInput,
  actorUserId?: string
): Promise<BlogPost> {
  const sanitizedContent = sanitizeHtml(input.contentHtml);

  const [post] = await db
    .insert(blogPosts)
    .values({
      storeId: input.storeId,
      title: input.title,
      slug: input.slug.toLowerCase(),
      excerpt: input.excerpt,
      contentHtml: sanitizedContent,
      featuredImageUrl: input.featuredImageUrl || null,
      author: input.author,
      category: input.category,
      tags: input.tags,
      seoTitle: input.seoTitle || input.title,
      seoDescription: input.seoDescription,
      status: input.status,
      language: input.language.toLowerCase(),
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    })
    .returning();

  if (actorUserId) {
    await recordAuditLog({
      storeId: input.storeId,
      actorType: "STAFF",
      actorId: actorUserId,
      action: "cms:create_blog_post",
      entity: "blog_post",
      entityId: post.id,
      after: { title: post.title, slug: post.slug, status: post.status },
    });
  }

  return post;
}

/**
 * Retrieves a blog post by slug.
 */
export async function getBlogPostBySlug(
  storeId: string,
  slug: string,
  language = "en",
  onlyPublished = true
): Promise<BlogPost | null> {
  const conditions = [
    eq(blogPosts.storeId, storeId),
    eq(blogPosts.slug, slug.toLowerCase()),
    eq(blogPosts.language, language.toLowerCase()),
  ];

  if (onlyPublished) {
    conditions.push(eq(blogPosts.status, "PUBLISHED"));
  }

  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(...conditions))
    .limit(1);

  return post || null;
}

/**
 * Lists blog posts for a store.
 */
export async function listBlogPosts(
  storeId: string,
  onlyPublished = false
): Promise<BlogPost[]> {
  const conditions = [eq(blogPosts.storeId, storeId)];
  if (onlyPublished) {
    conditions.push(eq(blogPosts.status, "PUBLISHED"));
  }

  return await db
    .select()
    .from(blogPosts)
    .where(and(...conditions))
    .orderBy(desc(blogPosts.createdAt));
}
