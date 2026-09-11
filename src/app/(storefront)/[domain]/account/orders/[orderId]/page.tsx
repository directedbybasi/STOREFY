import React from "react";
import { notFound } from "next/navigation";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { getOrderById } from "@/modules/orders/order-service";
import { CustomerOrderDetail } from "@/components/storefront/customer-order-detail";

interface CustomerOrderPageProps {
  params: Promise<{
    domain: string;
    orderId: string;
  }>;
}

export async function generateMetadata({ params }: CustomerOrderPageProps) {
  const { domain, orderId } = await params;
  return {
    title: `Order Details — STOREFY`,
    description: `Track shipment and view order history.`,
  };
}

export default async function CustomerOrderPage({ params }: CustomerOrderPageProps) {
  const { domain, orderId } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    notFound();
  }

  try {
    const order = await getOrderById(resolution.store.id, orderId);
    return <CustomerOrderDetail initialOrder={order} domain={domain} />;
  } catch (err) {
    notFound();
  }
}
