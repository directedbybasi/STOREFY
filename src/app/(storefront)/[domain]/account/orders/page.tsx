import React from "react";
import { notFound } from "next/navigation";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { listStoreOrders } from "@/modules/orders/order-service";
import { CustomerOrdersList } from "@/components/storefront/customer-orders-list";

interface CustomerOrdersPageProps {
  params: Promise<{
    domain: string;
  }>;
}

export const metadata = {
  title: "My Orders & Tracking — STOREFY",
  description: "Track shipments, download GST invoices, and view order history.",
  robots: { index: false, follow: false },
};

export default async function CustomerOrdersPage({ params }: CustomerOrdersPageProps) {
  const { domain } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    notFound();
  }

  // Load recent orders for display
  const { orders } = await listStoreOrders(resolution.store.id, {
    limit: 20,
  });

  return <CustomerOrdersList orders={orders} domain={domain} />;
}
