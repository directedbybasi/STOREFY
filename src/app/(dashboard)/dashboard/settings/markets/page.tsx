"use client";

import React, { useState } from "react";
import {
  Globe,
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MarketsSettingsPage() {
  const [markets] = useState([
    {
      id: "m1",
      name: "India (Domestic)",
      code: "IN",
      currency: "INR",
      language: "en, hi",
      isPrimary: true,
      countries: ["IN"],
    },
    {
      id: "m2",
      name: "United Arab Emirates & Gulf",
      code: "UAE",
      currency: "AED",
      language: "en, ar",
      isPrimary: false,
      countries: ["AE", "SA", "QA"],
    },
    {
      id: "m3",
      name: "North America & UK",
      code: "NA-UK",
      currency: "USD",
      language: "en",
      isPrimary: false,
      countries: ["US", "CA", "GB"],
    },
  ]);

  const [rates] = useState([
    { base: "INR", target: "USD", rate: 0.012, scaled: 12000, source: "MANUAL" },
    { base: "INR", target: "AED", rate: 0.044, scaled: 44000, source: "MANUAL" },
    { base: "INR", target: "EUR", rate: 0.011, scaled: 11000, source: "PROVIDER" },
    { base: "INR", target: "GBP", rate: 0.0095, scaled: 9500, source: "MANUAL" },
  ]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Markets & Global Commerce</h1>
            <span className="text-xs bg-teal-100 text-teal-800 font-semibold px-2 py-0.5 rounded-full">
              Phase 16 Global
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure regional storefront markets, multi-currency conversion, and regional taxes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Market
          </Button>
        </div>
      </div>

      {/* Markets Overview */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="font-semibold text-sm">Configured Regional Markets</h3>
        </div>
        <div className="divide-y text-sm">
          {markets.map((m) => (
            <div key={m.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base">{m.name}</span>
                  {m.isPrimary && (
                    <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Countries: {m.countries.join(", ")} • Default Language: {m.language}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Currency</p>
                  <span className="font-bold font-mono text-sm">{m.currency}</span>
                </div>
                <Button variant="outline" size="sm">
                  Manage Market
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exchange Rates */}
      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-sm">Multi-Currency Exchange Rates</h3>
            <p className="text-xs text-muted-foreground">
              Deterministic integer scaled conversions (Base Currency: INR). Never relies on browser-side rates.
            </p>
          </div>
          <Button size="sm" variant="outline">
            Update Rates
          </Button>
        </div>
        <div className="divide-y text-sm">
          {rates.map((r) => (
            <div key={r.target} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold font-mono text-base">
                  1 {r.base} <ArrowRight className="w-3.5 h-3.5 inline mx-1 text-muted-foreground" /> {r.rate} {r.target}
                </span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                  Factor: {r.scaled}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Source: {r.source}</span>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
