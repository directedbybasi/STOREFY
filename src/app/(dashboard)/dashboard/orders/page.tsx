import React from "react";
import Link from "next/link";
import { requirePermission } from "@/core/tenant/rbac";
import { listStoreOrders } from "@/modules/orders/order-service";
import { OrdersTable } from "@/components/dashboard/orders-table";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { formatTabularINR, formatTabularNumber } from "@/lib/design-tokens";
import {
  ShoppingBag,
  Clock,
  Truck,
  RotateCcw,
  DollarSign,
} from "lucide-react";

export const metadata = {
  title: "Orders & Fulfillment — STOREFY",
  description: "Manage orders, shipments, GST invoices, and customer returns.",
};

export default async function OrdersDashboardPage() {
  const ctx = await requirePermission("orders:read");

  const { orders, total } = await listStoreOrders(ctx.store.id, {
    limit: 50,
  });

  // Calculate quick metrics
  const pendingOrders = orders.filter(
    (o) => o.status === "CONFIRMED" || o.status === "PROCESSING" || o.status === "PACKED"
  ).length;

  const shippedOrders = orders.filter(
    (o) => o.status === "SHIPPED" || o.status === "OUT_FOR_DELIVERY"
  ).length;

  const totalRevenuePaise = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + o.totalPaise, 0);

  return (
    <div className="space-y-5">
      {/* Canonical Page Header */}
      <PageHeader
        title="Orders"
        description={`Manage orders, shipments, GST tax invoices, and fulfillment for ${ctx.store.name}.`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/returns" prefetch={true}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Returns Portal
            </Link>
          </Button>
        }
      />

      {/* Canonical Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Orders"
          value={formatTabularNumber(total)}
          icon={ShoppingBag}
        />

        <StatCard
          title="Pending Fulfillment"
          value={formatTabularNumber(pendingOrders)}
          subtitle="Orders awaiting dispatch"
          icon={Clock}
        />

        <StatCard
          title="In Transit"
          value={formatTabularNumber(shippedOrders)}
          subtitle="Active courier shipments"
          icon={Truck}
        />

        <StatCard
          title="Total Revenue"
          value={formatTabularINR(totalRevenuePaise)}
          subtitle="Non-cancelled volume"
          icon={DollarSign}
        />
      </div>

      {/* Orders Table */}
      <OrdersTable initialOrders={orders} total={total} />
    </div>
  );
}
