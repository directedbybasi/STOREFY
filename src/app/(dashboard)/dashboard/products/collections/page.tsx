import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getCollectionsAction, getProductsAction } from "@/modules/catalog";
import { CollectionManager } from "@/components/dashboard/products/collection-manager";

export const metadata = {
  title: "Collections — STOREFY",
};

export default async function CollectionsPage() {
  await requirePermission("catalog:read");

  const [collections, productsData] = await Promise.all([
    getCollectionsAction(),
    getProductsAction({ limit: 100 }),
  ]);

  return (
    <CollectionManager
      collections={collections}
      allProducts={productsData.products}
    />
  );
}
