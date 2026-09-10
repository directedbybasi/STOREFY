import React from "react";
import { requirePermission } from "@/core/tenant/rbac";
import { getProductsAction, getCategoriesAction, getCollectionsAction } from "@/modules/catalog";
import { ProductListClient } from "@/components/dashboard/products/product-list-client";

export const metadata = {
  title: "Products & Catalog — STOREFY",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    search?: string;
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | "ALL";
    categoryId?: string;
    collectionId?: string;
    sort?: "newest" | "oldest" | "price-asc" | "price-desc" | "title-asc" | "title-desc";
  }>;
}

export default async function ProductsPage({ searchParams }: PageProps) {
  await requirePermission("catalog:read");
  const params = await searchParams;

  const page = params.page ? parseInt(params.page, 10) : 1;
  const limit = params.limit ? parseInt(params.limit, 10) : 10;

  const [productsData, categoriesData, collectionsData] = await Promise.all([
    getProductsAction({
      page,
      limit,
      search: params.search,
      status: params.status,
      categoryId: params.categoryId,
      collectionId: params.collectionId,
      sort: params.sort,
    }),
    getCategoriesAction(),
    getCollectionsAction(),
  ]);

  return (
    <ProductListClient
      initialProducts={productsData.products}
      pagination={productsData.pagination}
      categories={categoriesData}
      collections={collectionsData}
    />
  );
}
