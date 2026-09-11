"use server";

import { requirePermission } from "@/core/tenant/rbac";
import * as cmsService from "./cms-service";
import {
  CreateCmsPageSchema,
  UpdateCmsPageSchema,
  CreateBlogPostSchema,
} from "./types";

export async function createPageAction(formData: unknown) {
  const parsed = CreateCmsPageSchema.parse(formData);
  const ctx = await requirePermission("content:write", parsed.storeId);
  return await cmsService.createPage(parsed, ctx.user.id);
}

export async function updatePageAction(formData: unknown) {
  const parsed = UpdateCmsPageSchema.parse(formData);
  const ctx = await requirePermission("content:write", parsed.storeId);
  return await cmsService.updatePage(parsed, ctx.user.id);
}

export async function createBlogPostAction(formData: unknown) {
  const parsed = CreateBlogPostSchema.parse(formData);
  const ctx = await requirePermission("content:write", parsed.storeId);
  return await cmsService.createBlogPost(parsed, ctx.user.id);
}

export async function listPagesAction(storeId: string) {
  await requirePermission("content:read", storeId);
  return await cmsService.listPages(storeId);
}

export async function listBlogPostsAction(storeId: string) {
  await requirePermission("content:read", storeId);
  return await cmsService.listBlogPosts(storeId);
}
