"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addStoreDomainAction,
  setPrimaryDomainAction,
  removeStoreDomainAction,
} from "@/modules/stores/domain-actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Globe, Plus, Trash2, ShieldCheck, AlertCircle, Loader2, Star } from "lucide-react";
import type { StoreDomain } from "@/database/schema/domains";

interface DomainsClientProps {
  subdomain: string;
  customDomains: StoreDomain[];
}

export function DomainsClient({ subdomain, customDomains }: DomainsClientProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await addStoreDomainAction(newDomain);
      if (!result.success) {
        setErrorMessage(result.error || "Failed to add domain");
        return;
      }
      setAddDialogOpen(false);
      setNewDomain("");
      router.refresh();
    });
  };

  const handleSetPrimary = (domainId: string) => {
    startTransition(async () => {
      await setPrimaryDomainAction(domainId);
      router.refresh();
    });
  };

  const handleRemove = (domainId: string) => {
    if (!confirm("Are you sure you want to remove this domain?")) return;

    startTransition(async () => {
      await removeStoreDomainAction(domainId);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Alert variant="destructive" className="border-rose-900/50 bg-rose-950/50 text-rose-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Domain Table Card */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-white">Configured Domains</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Hostnames routing to your merchant storefront
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setAddDialogOpen(true)}
            className="h-8 gap-1.5 bg-emerald-500 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Connect Custom Domain
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>SSL Status</TableHead>
                <TableHead>Verification Token</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Default platform subdomain */}
              <TableRow>
                <TableCell className="font-mono text-xs font-semibold text-white">
                  {subdomain}.storefy.shop
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/40 text-[10px] text-emerald-300">
                    Platform Subdomain
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Active (Cloudflare)
                  </span>
                </TableCell>
                <TableCell className="text-[11px] text-slate-500 font-mono">
                  Managed Automatically
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-[10px] text-slate-500 font-medium">Default</span>
                </TableCell>
              </TableRow>

              {/* Custom domains */}
              {customDomains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-mono text-xs font-medium text-white flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-indigo-400" />
                    {domain.domain}
                    {domain.isPrimary && (
                      <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-400">
                        Primary
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-[11px] text-slate-400">Custom Domain</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        domain.sslStatus === "ACTIVE"
                          ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[10px]"
                          : "border-amber-500/30 bg-amber-950/40 text-amber-300 text-[10px]"
                      }
                    >
                      {domain.sslStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-[11px] text-slate-400">
                    {domain.verificationToken}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {!domain.isPrimary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleSetPrimary(domain.id)}
                        className="h-7 px-2 text-[11px] text-slate-300 hover:text-white"
                        title="Set as Primary Storefront Domain"
                      >
                        <Star className="mr-1 h-3 w-3" />
                        Make Primary
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleRemove(domain.id)}
                      className="h-7 px-2 text-[11px] text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
                      title="Remove Domain"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DNS Setup Guide Card */}
      <Card className="border-slate-800 bg-slate-900/60 p-4">
        <h4 className="text-xs font-bold text-white mb-1">DNS Configuration Instructions</h4>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          To connect your custom domain, point your domain registrar&apos;s DNS records to our edge network:
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs font-mono">
          <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">CNAME Record</span>
            <span className="text-slate-300 font-semibold">@ or www &rarr; cname.storefy.shop</span>
          </div>
          <div className="rounded bg-slate-950 p-2.5 border border-slate-800">
            <span className="text-slate-500 text-[10px] block">TXT Verification Record</span>
            <span className="text-slate-300 font-semibold">_storefy-challenge &rarr; [Verification Token]</span>
          </div>
        </div>
      </Card>

      {/* Add Custom Domain Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-md">
          <form onSubmit={handleAddDomain}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white">Connect Custom Domain</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Enter your apex domain or subdomain without http/https (e.g., brand.com or shop.brand.com).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="domainName" className="text-xs text-slate-300">
                  Domain Name
                </Label>
                <Input
                  id="domainName"
                  placeholder="mybrand.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  required
                  disabled={isPending}
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAddDialogOpen(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !newDomain}
                className="bg-emerald-500 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
              >
                {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Add Domain
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
