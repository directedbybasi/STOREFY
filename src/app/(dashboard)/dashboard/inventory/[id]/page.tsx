import React from "react";
import { getInventoryDetailAction } from "@/modules/inventory";
import { InventoryDetailClient } from "@/components/dashboard/inventory/inventory-detail-client";

export const metadata = {
  title: "Inventory Detail & Movement Ledger — STOREFY",
  description: "View variant stock balances and immutable audit movement ledger.",
};

interface InventoryDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InventoryDetailPage({ params }: InventoryDetailPageProps) {
  const { id } = await params;
  const data = await getInventoryDetailAction(id);

  return <InventoryDetailClient data={data} />;
}
