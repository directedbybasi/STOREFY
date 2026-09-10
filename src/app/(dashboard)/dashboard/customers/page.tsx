import React from "react";
import { getCustomersListAction } from "@/modules/customers";
import { CustomerListClient } from "@/components/dashboard/customers/customer-list-client";

export const metadata = {
  title: "Customers & CRM — STOREFY",
  description: "Customer lifetime value, CRM directory, and segmentation.",
};

interface CustomersPageProps {
  searchParams: Promise<{
    search?: string;
    segment?: "ALL" | "NEW" | "RETURNING" | "HIGH_VALUE" | "INACTIVE";
    status?: "ALL" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
    page?: string;
    pageSize?: string;
    sortBy?: "name" | "email" | "total_spent" | "orders_count" | "created_at" | "last_order_at";
    sortOrder?: "asc" | "desc";
  }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const resolvedParams = await searchParams;

  const data = await getCustomersListAction({
    search: resolvedParams.search,
    segment: resolvedParams.segment || "ALL",
    status: resolvedParams.status || "ALL",
    page: resolvedParams.page ? parseInt(resolvedParams.page) : 1,
    pageSize: resolvedParams.pageSize ? parseInt(resolvedParams.pageSize) : 20,
    sortBy: resolvedParams.sortBy || "created_at",
    sortOrder: resolvedParams.sortOrder || "desc",
  });

  return <CustomerListClient data={data} />;
}
