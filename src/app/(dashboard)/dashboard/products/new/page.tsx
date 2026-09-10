import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getCategoriesAction, getCollectionsAction } from "@/modules/catalog";
import { ProductForm } from "@/components/dashboard/products/product-form";

export const metadata = {
  title: "New Product — STOREFY",
};

export default async function NewProductPage() {
  await requirePermission("catalog:write");

  const [categories, collections] = await Promise.all([
    getCategoriesAction(),
    getCollectionsAction(),
  ]);

  return (
    <ProductForm
      mode="create"
      categories={categories}
      collections={collections}
    />
  );
}
