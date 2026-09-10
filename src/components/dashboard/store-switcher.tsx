"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDashboard, type AuthorizedStoreItem } from "./can";
import { switchStoreAction, createStoreAction } from "@/modules/stores/actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Store, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";

export function StoreSwitcher() {
  const router = useRouter();
  const { tenant, authorizedStores } = useDashboard();
  const [isPending, startTransition] = useTransition();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newSubdomain, setNewSubdomain] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const activeStore = tenant.store;

  const handleSwitch = (store: AuthorizedStoreItem) => {
    if (activeStore && store.id === activeStore.id) return;

    startTransition(async () => {
      const result = await switchStoreAction(store.id);
      if (result.success) {
        router.refresh();
      }
    });
  };

  const handleCreateStore = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    startTransition(async () => {
      const res = await createStoreAction({
        name: newStoreName,
        subdomain: newSubdomain,
      });

      if (!res.success) {
        setCreateError(res.error || "Failed to create store");
        return;
      }

      setCreateDialogOpen(false);
      setNewStoreName("");
      setNewSubdomain("");
      router.refresh();
    });
  };

  // If no store exists at all, render direct Create Store button
  if (!activeStore && authorizedStores.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCreateDialogOpen(true)}
          className="flex h-9 items-center gap-2 border-emerald-800/80 bg-emerald-950/40 px-3 text-xs font-semibold text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300 transition"
        >
          <Plus className="h-3.5 w-3.5 text-emerald-400" />
          <span>Create Store</span>
        </Button>

        {/* Add New Store Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-md">
            <form onSubmit={handleCreateStore}>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-white">
                  Create First Store
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400">
                  Provision your initial storefront under {tenant.organization.name}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {createError && (
                  <p className="rounded bg-rose-950/50 p-2 text-xs text-rose-300 border border-rose-900/50">
                    {createError}
                  </p>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="newStoreName" className="text-xs text-slate-300">
                    Store Name
                  </Label>
                  <Input
                    id="newStoreName"
                    value={newStoreName}
                    onChange={(e) => {
                      setNewStoreName(e.target.value);
                      setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                    }}
                    placeholder="Artisan Leather"
                    required
                    disabled={isPending}
                    className="border-slate-800 bg-slate-950 text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newSubdomain" className="text-xs text-slate-300">
                    Subdomain URL
                  </Label>
                  <div className="flex items-center rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5">
                    <input
                      id="newSubdomain"
                      value={newSubdomain}
                      onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      placeholder="artisan-leather"
                      required
                      disabled={isPending}
                      className="w-full bg-transparent text-xs text-slate-100 outline-none"
                    />
                    <span className="text-xs font-medium text-slate-500">.storefy.shop</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateDialogOpen(false)}
                  className="text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !newStoreName || !newSubdomain}
                  className="bg-emerald-500 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
                >
                  {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                  Provision Store
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            className="flex h-9 items-center gap-2 border-slate-800 bg-slate-900/90 px-3 text-xs font-semibold text-slate-100 hover:border-slate-700 hover:bg-slate-800 focus-visible:ring-emerald-500"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
              <Store className="h-3 w-3" />
            </div>
            <div className="flex flex-col text-left">
              <span className="max-w-[120px] truncate font-medium sm:max-w-[160px]">
                {activeStore ? activeStore.name : "Select Store"}
              </span>
            </div>
            {isPending ? (
              <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin text-slate-400" />
            ) : (
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 p-1.5">
          <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
            <span>Stores ({tenant.organization.name})</span>
            <Badge variant="outline" className="border-slate-700 bg-slate-800 px-1 py-0 text-[9px] text-slate-300">
              {authorizedStores.length}
            </Badge>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <div className="max-h-60 overflow-y-auto space-y-1">
            {authorizedStores.map((store) => {
              const isSelected = activeStore ? store.id === activeStore.id : false;
              return (
                <DropdownMenuItem
                  key={store.id}
                  onClick={() => handleSwitch(store)}
                  className="flex items-center justify-between rounded-md p-2 text-xs"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-200">{store.name}</span>
                      {isSelected && (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {store.subdomain}.storefy.shop
                    </span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-emerald-400" />}
                </DropdownMenuItem>
              );
            })}
          </div>

          {(tenant.isOwner || tenant.permissions.has("settings:manage")) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2 text-xs font-semibold text-emerald-400 focus:bg-emerald-950/40 focus:text-emerald-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Add New Store
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add New Store Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-md">
          <form onSubmit={handleCreateStore}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white">
                Create New Store
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Add an additional storefront under {tenant.organization.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {createError && (
                <p className="rounded bg-rose-950/50 p-2 text-xs text-rose-300 border border-rose-900/50">
                  {createError}
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="newStoreName" className="text-xs text-slate-300">
                  Store Name
                </Label>
                <Input
                  id="newStoreName"
                  value={newStoreName}
                  onChange={(e) => {
                    setNewStoreName(e.target.value);
                    setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                  }}
                  placeholder="Artisan Leather"
                  required
                  disabled={isPending}
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newSubdomain" className="text-xs text-slate-300">
                  Subdomain URL
                </Label>
                <div className="flex items-center rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5">
                  <input
                    id="newSubdomain"
                    value={newSubdomain}
                    onChange={(e) => setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="artisan-leather"
                    required
                    disabled={isPending}
                    className="w-full bg-transparent text-xs text-slate-100 outline-none"
                  />
                  <span className="text-xs font-medium text-slate-500">.storefy.shop</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !newStoreName || !newSubdomain}
                className="bg-emerald-500 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
              >
                {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Provision Store
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
