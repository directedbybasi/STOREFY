"use client";

import React, { useState } from "react";
import {
  Store,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Printer,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  Minus,
  Trash2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PosItem {
  id: string;
  title: string;
  variantTitle: string;
  pricePaise: number;
  quantity: number;
}

export default function PosPage() {
  const [sessionActive, setSessionActive] = useState(true);
  const [sessionNumber, setSessionNumber] = useState("POS-SHIFT-8812");
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

  const subtotal = cart.reduce(
    (acc, item) => acc + item.pricePaise * item.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  const change = Math.max(0, tenderAmount * 100 - total);

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
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

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] p-6 gap-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Point of Sale (POS)</h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
              Phase 16 Omnichannel
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Server-authoritative in-store counter checkout & inventory deduction
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm">
            <Store className="w-4 h-4 text-primary" />
            <span className="font-medium">Downtown Flagship Store</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {sessionActive ? `Shift: ${sessionNumber}` : "Shift Closed"}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSessionActive(!sessionActive)}
          >
            <Lock className="w-4 h-4 mr-1.5" />
            {sessionActive ? "Close Shift" : "Open Register"}
          </Button>
        </div>
      </div>

      {/* Main Terminal View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Left 2 Cols: Product Catalog & Search */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products by title, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-1">
            {[
              { id: "p1", title: "Handcrafted Silk Kurta", variant: "Navy Blue", price: 2499 },
              { id: "p2", title: "Artisan Leather Wallet", variant: "Classic Brown", price: 1299 },
              { id: "p3", title: "Ceramic Coffee Mug", variant: "Matte Black", price: 499 },
              { id: "p4", title: "Organic Cotton Tee", variant: "Heather Grey", price: 799 },
              { id: "p5", title: "Embroidered Pashmina", variant: "Crimson", price: 3499 },
              { id: "p6", title: "Handwoven Jute Rug", variant: "Natural 4x6", price: 1999 },
            ].map((prod) => (
              <div
                key={prod.id}
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
                className="p-4 border rounded-xl bg-card hover:border-primary cursor-pointer transition shadow-sm flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-semibold text-sm line-clamp-1">{prod.title}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{prod.variant}</p>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="font-bold text-sm">₹{prod.price}</span>
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: In-Store Cart & Tender */}
        <div className="flex flex-col border rounded-xl bg-card p-4 shadow-sm h-full justify-between">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Active Cart ({cart.reduce((a, b) => a + b.quantity, 0)})
            </h3>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-destructive hover:bg-destructive/10"
                onClick={() => setCart([])}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto my-3 space-y-2 pr-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm p-4 text-center">
                <ShoppingCart className="w-10 h-10 mb-2 stroke-1" />
                <p>No items in counter cart</p>
                <p className="text-xs mt-1">Tap products on the left to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg text-sm"
                >
                  <div className="flex-1 pr-2">
                    <p className="font-medium line-clamp-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{(item.pricePaise / 100).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-xs min-w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-bold ml-3 text-xs">
                    ₹{((item.pricePaise * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Totals & Payment Actions */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>₹{(subtotal / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Taxes (GST 5%)</span>
              <span>₹{(tax / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-1 border-t">
              <span>Total Payable</span>
              <span className="text-primary">₹{(total / 100).toFixed(2)}</span>
            </div>

            {/* Tender Amount Input for Cash */}
            <div className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
              <span>Tender Cash (₹):</span>
              <input
                type="number"
                value={tenderAmount}
                onChange={(e) => setTenderAmount(Number(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-right font-bold border rounded bg-card"
              />
            </div>
            <div className="flex justify-between text-xs font-semibold text-emerald-700">
              <span>Change Due:</span>
              <span>₹{(change / 100).toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full flex items-center gap-1.5"
                disabled={cart.length === 0}
                onClick={() => handleCompleteSale("CARD")}
              >
                <CreditCard className="w-4 h-4" /> Card
              </Button>
              <Button
                className="w-full flex items-center gap-1.5"
                disabled={cart.length === 0}
                onClick={() => handleCompleteSale("CASH")}
              >
                <DollarSign className="w-4 h-4" /> Cash
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Completed Sale Receipt Modal */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h3 className="font-bold text-lg">POS Sale Confirmed</h3>
              <p className="text-xs text-muted-foreground">
                Order #{completedOrder.orderNumber}
              </p>
            </div>

            <div className="border-y py-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-semibold">{completedOrder.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-bold text-primary">
                  ₹{(completedOrder.total / 100).toFixed(2)}
                </span>
              </div>
              {completedOrder.paymentMethod === "CASH" && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Change Given:</span>
                  <span>₹{(completedOrder.change / 100).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-1.5" /> Print Receipt
              </Button>
              <Button
                className="flex-1"
                onClick={() => setCompletedOrder(null)}
              >
                Next Customer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
