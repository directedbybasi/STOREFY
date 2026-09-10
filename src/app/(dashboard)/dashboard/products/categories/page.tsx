import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getCategoriesTreeAction, getCategoriesAction } from "@/modules/catalog";
import { CategoryManager } from "@/components/dashboard/products/category-manager";

export const metadata = {
  title: "Categories — STOREFY",
};

export default async function CategoriesPage() {
  await requirePermission("catalog:read");

  const [categoriesTree, flatCategories] = await Promise.all([
    getCategoriesTreeAction(),
    getCategoriesAction(),
  ]);

  return (
    <CategoryManager
      categoriesTree={categoriesTree}
      flatCategories={flatCategories}
    />
  );
}
