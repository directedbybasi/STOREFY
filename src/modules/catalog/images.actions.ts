"use server";

import { db } from "@/database/client";
import { productImages, products } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotFoundError } from "@/core/errors";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Uploads a product image directly to Supabase Storage under a tenant-scoped path.
 * Path format: stores/{storeId}/products/{productId}/{timestamp}-{uuid}.{ext}
 */
export async function uploadProductImageAction(formData: FormData) {
  const ctx = await requirePermission("catalog:write");
  const storeId = ctx.store.id;

  const file = formData.get("file") as File | null;
  const productId = (formData.get("productId") as string) || null;

  if (!file) {
    throw new Error("No file provided for upload.");
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed types: JPG, PNG, WebP, GIF.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File size exceeds 5MB limit.");
  }

  // If productId provided, verify store owns this product
  if (productId) {
    const [prod] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
      .limit(1);

    if (!prod) {
      throw new Error("Target product not found or unauthorized.");
    }
  }

  // Generate safe storage path
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueId = crypto.randomBytes(8).toString("hex");
  const storagePath = `stores/${storeId}/products/${productId || "temp"}/${Date.now()}-${uniqueId}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from("store-media")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage.from("store-media").getPublicUrl(storagePath);
  const imageUrl = urlData.publicUrl;

  let imageRecord = null;
  if (productId) {
    const [inserted] = await db
      .insert(productImages)
      .values({
        storeId,
        productId,
        imageUrl,
        storagePath,
        altText: file.name.replace(/\.[^/.]+$/, ""),
        sortOrder: 0,
      })
      .returning();
    imageRecord = inserted;
  }

  return {
    success: true,
    imageUrl,
    storagePath,
    imageRecord,
  };
}

/**
 * Deletes a product image from database and Supabase Storage.
 */
export async function deleteProductImageAction(imageId: string) {
  const ctx = await requirePermission("catalog:write");
  const storeId = ctx.store.id;

  const [image] = await db
    .select()
    .from(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.storeId, storeId)))
    .limit(1);

  if (!image) {
    throw new NotFoundError(`Image not found or unauthorized: ${imageId}`);
  }

  // Delete from storage if storagePath is present
  if (image.storagePath) {
    try {
      const supabase = createAdminClient();
      await supabase.storage.from("store-media").remove([image.storagePath]);
    } catch {
      // Continue even if storage object was already removed
    }
  }

  await db
    .delete(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.storeId, storeId)));

  return { success: true, id: imageId };
}

/**
 * Reorders images for a product.
 */
export async function reorderProductImagesAction(productId: string, imageIds: string[]) {
  const ctx = await requirePermission("catalog:write");
  const storeId = ctx.store.id;

  for (let idx = 0; idx < imageIds.length; idx++) {
    await db
      .update(productImages)
      .set({ sortOrder: idx })
      .where(
        and(
          eq(productImages.id, imageIds[idx]),
          eq(productImages.productId, productId),
          eq(productImages.storeId, storeId)
        )
      );
  }

  return { success: true };
}
