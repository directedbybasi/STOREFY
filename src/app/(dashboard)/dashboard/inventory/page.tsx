import React from "react";
import { getInventoryListAction } from "@/modules/inventory";
import { InventoryListClient } from "@/components/dashboard/inventory/inventory-list-client";

export const metadata = {
  title: "Inventory & Ledger — STOREFY",
  description: "Real-time stock ledger, available quantities, and auditable movement tracking.",
};

interface InventoryPageProps {
  searchParams: Promise<{
    search?: string;
    stockStatus?: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
    page?: string;
    pageSize?: string;
    sortBy?: "name" | "sku" | "available" | "on_hand" | "reserved";
    sortOrder?: "asc" | "desc";
  }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const resolvedParams = await searchParams;

  const data = await getInventoryListAction({
    search: resolvedParams.search,
    stockStatus: resolvedParams.stockStatus,
    page: resolvedParams.page ? parseInt(resolvedParams.page) : 1,
    pageSize: resolvedParams.pageSize ? parseInt(resolvedParams.pageSize) : 20,
    sortBy: resolvedParams.sortBy || "available",
    sortOrder: resolvedParams.sortOrder || "asc",
  });

  return <InventoryListClient data={data} />;
}
