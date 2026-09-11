"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDashboard, type AuthorizedStoreItem } from "./can";
import { switchStoreAction, createStoreAction } from "@/modules/stores/actions";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Store, Check, ChevronsUpDown, Plus, Loader2, Settings } from "lucide-react";

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

  const otherStores = authorizedStores.filter(
    (s) => !activeStore || s.id !== activeStore.id
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            className="flex h-8 items-center gap-2 border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors"
          >
            <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-primary/10 text-primary">
              <Store className="h-3 w-3" />
            </div>
            <div className="flex flex-col text-left">
              <span className="max-w-[110px] truncate font-medium sm:max-w-[140px]">
                {activeStore ? activeStore.name : "Select Store"}
              </span>
            </div>
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <ChevronsUpDown className="h-3 w-3 text-muted-foreground/80" />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64 p-1.5 bg-popover border-border">
          {/* Current Store Group */}
          {activeStore && (
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Current Store
              </DropdownMenuLabel>
              <div className="flex items-center justify-between rounded-md p-2 bg-muted/40 border border-border/50 text-xs">
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-foreground truncate">{activeStore.name}</span>
                  <span className="text-[11px] text-muted-foreground font-mono truncate">
                    {activeStore.subdomain}.storefy.shop
                  </span>
                </div>
                <Badge variant="success" dot className="shrink-0 text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              </div>
            </DropdownMenuGroup>
          )}

          {/* Other Stores Group */}
          {otherStores.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Other Stores ({otherStores.length})
                </DropdownMenuLabel>
                <div className="max-h-48 overflow-y-auto space-y-0.5 custom-scrollbar">
                  {otherStores.map((store) => (
                    <DropdownMenuItem
                      key={store.id}
                      onClick={() => handleSwitch(store)}
                      className="flex items-center justify-between rounded-md p-2 text-xs cursor-pointer hover:bg-muted"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground truncate">{store.name}</span>
                        <span className="text-[11px] text-muted-foreground font-mono truncate">
                          {store.subdomain}.storefy.shop
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuGroup>
            </>
          )}

          <DropdownMenuSeparator />

          {/* Store Actions Group */}
          <DropdownMenuGroup>
            {(tenant.isOwner || tenant.permissions.has("settings:manage")) && (
              <DropdownMenuItem
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2 text-xs font-medium text-primary hover:text-primary cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create New Store</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild className="gap-2 text-xs text-foreground cursor-pointer">
              <Link href="/dashboard/settings">
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Store Settings</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add New Store Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
          <form onSubmit={handleCreateStore}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-foreground">
                Create New Store
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Provision a new storefront under {tenant.organization.name}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              {createError && (
                <p className="rounded-md bg-rose-500/10 p-2 text-xs text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  {createError}
                </p>
              )}

              <div className="space-y-1">
                <Label htmlFor="newStoreName" className="text-xs font-medium text-foreground">
                  Store Name
                </Label>
                <Input
                  id="newStoreName"
                  value={newStoreName}
                  onChange={(e) => {
                    setNewStoreName(e.target.value);
                    setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                  }}
                  placeholder="e.g. Artisan Studio"
                  required
                  disabled={isPending}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="newSubdomain" className="text-xs font-medium text-foreground">
                  Subdomain URL
                </Label>
                <div className="flex items-center rounded-md border border-input bg-background px-3 py-1 text-xs">
                  <input
                    id="newSubdomain"
                    value={newSubdomain}
                    onChange={(e) =>
                      setNewSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                    }
                    placeholder="artisan-studio"
                    required
                    disabled={isPending}
                    className="w-full bg-transparent text-xs text-foreground outline-none"
                  />
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    .storefy.shop
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !newStoreName || !newSubdomain}
              >
                {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Provision Store
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
