"use client";

import React, { useState } from "react";
import {
  Code,
  Key,
  Webhook,
  AppWindow,
  Plus,
  Copy,
  Check,
  Trash2,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeveloperSettingsPage() {
  const [activeTab, setActiveTab] = useState<"keys" | "webhooks" | "apps">("keys");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [apiKeys] = useState([
    {
      id: "key-1",
      label: "Inventory ERP Sync Agent",
      prefix: "sfy_live_9a8b1c2d",
      scopes: ["read_products", "read_inventory", "write_inventory"],
      lastUsedAt: "Just now",
      createdAt: "Sept 10, 2026",
    },
    {
      id: "key-2",
      label: "Custom Logistics Webhook Dispatcher",
      prefix: "sfy_live_3f4e5d6c",
      scopes: ["read_orders", "write_orders"],
      lastUsedAt: "2 days ago",
      createdAt: "Sept 01, 2026",
    },
  ]);

  const [webhooks] = useState([
    {
      id: "wh-1",
      url: "https://api.warehousesync.io/v1/storefy/events",
      eventTypes: ["order.created", "order.fulfilled", "inventory.updated"],
      secretPreview: "whsec_••••9942",
      status: "ACTIVE",
      failureCount: 0,
    },
    {
      id: "wh-2",
      url: "https://erp.enterprise.internal/webhooks",
      eventTypes: ["refund.created", "customer.created"],
      secretPreview: "whsec_••••1183",
      status: "ACTIVE",
      failureCount: 0,
    },
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Developer Platform & APIs</h1>
            <span className="text-xs bg-sky-100 text-sky-800 font-semibold px-2 py-0.5 rounded-full">
              Phase 16 Developer
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage scoped API keys, outbound merchant webhooks, and OAuth integrations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> {activeTab === "keys" ? "Generate API Key" : "Register Webhook"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab("keys")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "keys"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Key className="w-4 h-4" /> Scoped API Keys ({apiKeys.length})
        </button>
        <button
          onClick={() => setActiveTab("webhooks")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "webhooks"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Webhook className="w-4 h-4" /> Outbound Webhooks ({webhooks.length})
        </button>
        <button
          onClick={() => setActiveTab("apps")}
          className={`pb-3 border-b-2 transition flex items-center gap-2 ${
            activeTab === "apps"
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <AppWindow className="w-4 h-4" /> OAuth Apps (1)
        </button>
      </div>

      {/* Keys Tab */}
      {activeTab === "keys" && (
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-sm">Active Secret API Keys</h3>
              <p className="text-xs text-muted-foreground">
                Hashed SHA-256 at rest. Allows programmatic read/write access according to assigned scopes.
              </p>
            </div>
          </div>
          <div className="divide-y text-sm">
            {apiKeys.map((k) => (
              <div key={k.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{k.label}</span>
                    <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                      {k.prefix}••••••••
                      <button
                        onClick={() => copyToClipboard(k.prefix)}
                        className="text-muted-foreground hover:text-foreground ml-1"
                      >
                        {copiedKey === k.prefix ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Last used: {k.lastUsedAt}</p>
                    <p>Created: {k.createdAt}</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 mr-1" /> Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === "webhooks" && (
        <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Merchant Outbound Webhook Subscriptions</h3>
            <p className="text-xs text-muted-foreground">
              Signed with HMAC-SHA256 (X-Storefy-Signature). Delivers real-time store events.
            </p>
          </div>
          <div className="divide-y text-sm">
            {webhooks.map((w) => (
              <div key={w.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-mono font-medium text-sm text-primary">{w.url}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Signing Secret: {w.secretPreview}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {w.eventTypes.map((ev) => (
                      <span
                        key={ev}
                        className="text-[11px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-1 rounded">
                    {w.status}
                  </span>
                  <Button variant="outline" size="sm">
                    Send Test Event
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OAuth Apps Tab */}
      {activeTab === "apps" && (
        <div className="border rounded-xl bg-card p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base">Registered OAuth 2.0 Applications</h3>
              <p className="text-xs text-muted-foreground">
                Authorize external third-party tools via standard OAuth authorization code flow
              </p>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" /> New OAuth Client
            </Button>
          </div>
          <div className="p-4 border rounded-lg bg-muted/20 space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-bold text-base">Custom Mobile App Connector</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              Client ID: app_88192a00bc91ef41
            </p>
            <p className="text-xs text-muted-foreground">
              Redirect URIs: https://mobile.aaravstudio.com/oauth/callback
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
