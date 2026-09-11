"use client";

import React, { useState } from "react";
import {
  Store,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Printer,
  CheckCircle2,
  Search,
  Plus,
  Minus,
  Lock,
  Unlock,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";

interface PosItem {
  id: string;
  title: string;
  variantTitle: string;
  pricePaise: number;
  quantity: number;
}

export default function PosPage() {
  const [sessionActive, setSessionActive] = useState(true);
  const [sessionNumber] = useState("POS-SHIFT-8812");
  const [cart, setCart] = useState<PosItem[]>([
    {
      id: "demo-item-1",
      title: "Handcrafted Silk Kurta",
      variantTitle: "L / Navy Blue",
      pricePaise: 249900,
      quantity: 1,
    },
    {
      id: "demo-item-2",
      title: "Artisan Leather Wallet",
      variantTitle: "Classic Brown",
      pricePaise: 129900,
      quantity: 1,
    },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tenderAmount, setTenderAmount] = useState<number>(4000);
  const [completedOrder, setCompletedOrder] = useState<{
    orderNumber: string;
    total: number;
    change: number;
    paymentMethod: string;
  } | null>(null);

  const subtotal = cart.reduce((acc, item) => acc + item.pricePaise * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  const change = Math.max(0, tenderAmount * 100 - total);

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleCompleteSale = (method: string) => {
    if (cart.length === 0) return;
    const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;
    setCompletedOrder({
      orderNumber,
      total,
      change,
      paymentMethod: method,
    });
    setCart([]);
  };

  const catalogProducts = [
    { id: "p1", title: "Handcrafted Silk Kurta", variant: "Navy Blue", price: 2499 },
    { id: "p2", title: "Artisan Leather Wallet", variant: "Classic Brown", price: 1299 },
    { id: "p3", title: "Ceramic Coffee Mug", variant: "Matte Black", price: 499 },
    { id: "p4", title: "Organic Cotton Tee", variant: "Heather Grey", price: 799 },
    { id: "p5", title: "Embroidered Pashmina", variant: "Crimson", price: 3499 },
    { id: "p6", title: "Handwoven Jute Rug", variant: "Natural 4x6", price: 1999 },
  ].filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.variant.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <PageHeader
        title="Point of Sale (POS)"
        description="High-speed counter checkout terminal and real-time inventory deduction."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "POS Terminal" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={sessionActive ? "success" : "neutral"} dot>
              {sessionActive ? `Shift: ${sessionNumber}` : "Shift Closed"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSessionActive(!sessionActive)}
            >
              {sessionActive ? (
                <>
                  <Lock className="h-3.5 w-3.5 mr-1.5" />
                  Close Shift
                </>
              ) : (
                <>
                  <Unlock className="h-3.5 w-3.5 mr-1.5" />
                  Open Register
                </>
              )}
            </Button>
          </div>
        }
      />

      {/* Main Terminal View: Three-zone layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Zone 1: Products Catalog (Cols 1-7) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products by title, SKU, or barcode (F2)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {catalogProducts.map((prod) => (
              <button
                key={prod.id}
                type="button"
                onClick={() => {
                  setCart((prev) => {
                    const existing = prev.find((i) => i.id === prod.id);
                    if (existing) {
                      return prev.map((i) =>
                        i.id === prod.id ? { ...i, quantity: i.quantity + 1 } : i
                      );
                    }
                    return [
                      ...prev,
                      {
                        id: prod.id,
                        title: prod.title,
                        variantTitle: prod.variant,
                        pricePaise: prod.price * 100,
                        quantity: 1,
                      },
                    ];
                  });
                }}
                className="p-3 rounded-lg border border-border bg-card hover:border-primary/50 text-left transition-all active:scale-[0.99] flex flex-col justify-between h-28"
              >
                <div>
                  <h4 className="font-medium text-xs text-foreground line-clamp-1">{prod.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{prod.variant}</p>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
                  <span className="font-semibold text-xs text-foreground font-tabular">₹{prod.price}</span>
                  <span className="text-[11px] text-primary font-medium flex items-center gap-0.5">
                    <Plus className="h-3 w-3" /> Add
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Zone 2 & 3: Cart & Payment (Cols 8-12) */}
        <div className="lg:col-span-5 space-y-3">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-xs text-foreground">
                  Active Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
                </h3>
              </div>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setCart([])}
                >
                  Clear Cart
                </Button>
              )}
            </div>

            {/* Cart Items */}
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Cart is currently empty.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60 text-xs"
                  >
                    <div className="flex-1 pr-2">
                      <p className="font-medium text-foreground line-clamp-1">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground font-tabular">
                        ₹{(item.pricePaise / 100).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-6 w-6 rounded border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="font-semibold font-tabular text-xs min-w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-6 w-6 rounded border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="font-semibold text-foreground ml-3 text-xs font-tabular">
                      ₹{((item.pricePaise * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Zone 3: Payment Breakdown & Actions */}
            <div className="pt-2 border-t border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground font-tabular">
                <span>Subtotal</span>
                <span>₹{(subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground font-tabular">
                <span>GST (5%)</span>
                <span>₹{(tax / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border font-tabular text-foreground">
                <span>Total Payable</span>
                <span>₹{(total / 100).toFixed(2)}</span>
              </div>

              {/* Tender Amount */}
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/60">
                <span className="text-[11px] text-muted-foreground">Cash Tendered (₹):</span>
                <input
                  type="number"
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(Number(e.target.value) || 0)}
                  className="w-20 px-2 py-0.5 text-right font-semibold font-tabular rounded border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex justify-between font-medium text-emerald-700 dark:text-emerald-400 font-tabular text-[11px]">
                <span>Change Due:</span>
                <span>₹{(change / 100).toFixed(2)}</span>
              </div>

              {/* Payment Methods */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium"
                  disabled={cart.length === 0}
                  onClick={() => handleCompleteSale("UPI / QR")}
                >
                  <QrCode className="h-3.5 w-3.5 mr-1" /> UPI
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-medium"
                  disabled={cart.length === 0}
                  onClick={() => handleCompleteSale("CARD")}
                >
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> Card
                </Button>
                <Button
                  size="sm"
                  className="w-full text-xs font-semibold"
                  disabled={cart.length === 0}
                  onClick={() => handleCompleteSale("CASH")}
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> Cash
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Completed Sale Receipt Modal */}
      {completedOrder && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-sm w-full p-6 space-y-4 shadow-lg border-border">
            <div className="text-center space-y-1">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
              <h3 className="font-semibold text-sm text-foreground">Sale Completed</h3>
              <p className="text-xs text-muted-foreground font-mono">
                Order #{completedOrder.orderNumber}
              </p>
            </div>

            <div className="border-y border-border py-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium text-foreground">{completedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between font-tabular">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-semibold text-foreground">
                  ₹{(completedOrder.total / 100).toFixed(2)}
                </span>
              </div>
              {completedOrder.paymentMethod === "CASH" && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-medium font-tabular">
                  <span>Change Given:</span>
                  <span>₹{(completedOrder.change / 100).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => setCompletedOrder(null)}
              >
                Next Sale
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
