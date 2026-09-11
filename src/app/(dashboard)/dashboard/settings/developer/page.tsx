"use client";

import React, { useState } from "react";
import {
  Key,
  Webhook,
  AppWindow,
  Plus,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="space-y-6">
      <PageHeader
        title="Developer Platform & APIs"
        description="Manage programmatic API keys, real-time outbound webhooks, and third-party OAuth integrations."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings", href: "/dashboard/settings" },
          { label: "Developer" },
        ]}
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            {activeTab === "keys" ? "Generate API Key" : "Register Webhook"}
          </Button>
        }
      />

      {/* Segment Navigation */}
      <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border">
        <button
          type="button"
          onClick={() => setActiveTab("keys")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "keys"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Key className="h-3.5 w-3.5" />
          <span>API Keys ({apiKeys.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("webhooks")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "webhooks"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Webhook className="h-3.5 w-3.5" />
          <span>Webhooks ({webhooks.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("apps")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
            activeTab === "apps"
              ? "bg-card text-foreground shadow-xs border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AppWindow className="h-3.5 w-3.5" />
          <span>OAuth Apps (1)</span>
        </button>
      </div>

      {/* Keys Tab */}
      {activeTab === "keys" && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key Label & Prefix</TableHead>
                <TableHead>Permissions / Scopes</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell>
                    <div className="font-medium text-foreground text-xs">{k.label}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-mono text-[10px] text-muted-foreground">{k.prefix}••••••••</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(k.prefix)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                      >
                        {copiedKey === k.prefix ? (
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.map((s) => (
                        <Badge key={s} variant="secondary" className="font-mono text-[9px]">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-tabular">
                    {k.createdAt}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {k.lastUsedAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Webhooks Tab */}
      {activeTab === "webhooks" && (
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Webhook Endpoint</TableHead>
                <TableHead>Subscribed Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhooks.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <p className="font-mono text-xs font-medium text-foreground truncate max-w-sm">{w.url}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                      Signing Secret: {w.secretPreview}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {w.eventTypes.map((ev) => (
                        <Badge key={ev} variant="secondary" className="font-mono text-[9px]">
                          {ev}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" dot>
                      {w.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="xs">
                      Send Test Event
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* OAuth Apps Tab */}
      {activeTab === "apps" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-foreground">Custom Mobile App Connector</h4>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Client ID: app_88192a00bc91ef41
              </p>
            </div>
            <Badge variant="success" dot>Active</Badge>
          </div>
          <div className="pt-2 border-t border-border text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Redirect URI: </span>
            <span className="font-mono">https://mobile.aaravstudio.com/oauth/callback</span>
          </div>
        </Card>
      )}
    </div>
  );
}
