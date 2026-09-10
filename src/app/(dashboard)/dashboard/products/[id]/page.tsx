import React from "react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/core/tenant/rbac";
import {
  getProductByIdAction,
  getCategoriesAction,
  getCollectionsAction,
} from "@/modules/catalog";
import { ProductForm } from "@/components/dashboard/products/product-form";

export const metadata = {
  title: "Edit Product — STOREFY",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: PageProps) {
  await requirePermission("catalog:read");
  const { id } = await params;

  try {
    const [productData, categories, collections] = await Promise.all([
      getProductByIdAction(id),
      getCategoriesAction(),
      getCollectionsAction(),
    ]);

    return (
      <ProductForm
        mode="edit"
        initialProduct={productData.product}
        initialVariants={productData.variants}
        initialImages={productData.images}
        initialCollectionIds={productData.collectionIds}
        categories={categories}
        collections={collections}
      />
    );
  } catch {
    notFound();
  }
}
