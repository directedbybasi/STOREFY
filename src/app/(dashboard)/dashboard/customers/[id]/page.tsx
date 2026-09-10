import React from "react";
import { getCustomerByIdAction } from "@/modules/customers";
import { CustomerDetailClient } from "@/components/dashboard/customers/customer-detail-client";

export const metadata = {
  title: "Customer 360 Profile — STOREFY",
  description: "View customer details, address book, metrics, and activity.",
};

interface CustomerDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const data = await getCustomerByIdAction(id);

  return <CustomerDetailClient data={data} />;
}
