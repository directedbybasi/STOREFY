"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  UserPlus,
  Mail,
  Phone,
  ArrowUpDown,
  ExternalLink,
  Archive,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type CustomerListResult,
  type CustomerSegment,
  createCustomerAction,
  archiveCustomerAction,
} from "@/modules/customers";

interface CustomerListClientProps {
  data: CustomerListResult;
}

export function CustomerListClient({ data }: CustomerListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [activeSegment, setActiveSegment] = useState<string>(
    searchParams.get("segment") || "ALL"
  );
  const [activeSort, setActiveSort] = useState<string>(
    searchParams.get("sortBy") || "created_at"
  );
  const [sortOrder, setSortOrder] = useState<string>(
    searchParams.get("sortOrder") || "desc"
  );

  // Create Customer Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const newStatus = "ACTIVE";
  const [newNotes, setNewNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  function updateQuery(params: Record<string, string | null>) {
    const current = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === "" || value === "ALL") {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }
    if (!("page" in params)) {
      current.delete("page");
    }
    startTransition(() => {
      router.push(`/dashboard/customers?${current.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchQuery });
  }

  function handleSegmentChange(segment: string) {
    setActiveSegment(segment);
    updateQuery({ segment });
  }

  function handleSortChange(column: string) {
    const nextOrder = activeSort === column && sortOrder === "asc" ? "desc" : "asc";
    setActiveSort(column);
    setSortOrder(nextOrder);
    updateQuery({ sortBy: column, sortOrder: nextOrder });
  }

  async function handleCreateCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setIsCreating(true);

    try {
      const res = await createCustomerAction({
        firstName: newFirstName,
        lastName: newLastName,
        email: newEmail || undefined,
        phone: newPhone || undefined,
        status: newStatus,
        notes: newNotes || undefined,
      });

      if (!res?.success) {
        setCreateError("Failed to create customer");
        setIsCreating(false);
        return;
      }

      setCreateModalOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPhone("");
      setNewNotes("");
      router.refresh();
    } catch {
      setCreateError("An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleArchive(customerId: string) {
    if (!confirm("Are you sure you want to archive this customer?")) return;
    startTransition(async () => {
      await archiveCustomerAction(customerId);
      router.refresh();
    });
  }

  function renderSegmentBadge(segment: CustomerSegment) {
    switch (segment) {
      case "HIGH_VALUE":
        return <Badge variant="warning" dot>High Value</Badge>;
      case "RETURNING":
        return <Badge variant="info" dot>Returning</Badge>;
      case "NEW":
        return <Badge variant="success" dot>New</Badge>;
      case "INACTIVE":
        return <Badge variant="neutral" dot>Inactive</Badge>;
      default:
        return <Badge variant="neutral">{segment}</Badge>;
    }
  }

  return (
    <div className="space-y-5">
      {/* Canonical Page Header */}
      <PageHeader
        title="Customers"
        description="Buyer profiles, lifetime value, contact information, and segmentation."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setCreateError(null);
              setCreateModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Customer
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          title="Total Customers"
          value={data.summary.totalCustomers}
          icon={Users}
        />
        <StatCard
          title="Active Buyers"
          value={data.summary.activeCount}
          subtitle="Recent purchase activity"
        />
        <StatCard
          title="High Value"
          value={data.summary.highValueCount}
          subtitle="Top tier lifetime spend"
        />
        <StatCard
          title="Returning"
          value={data.summary.returningCount}
          subtitle="Repeat purchasers"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Segment Tabs */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: "ALL", label: "All Segments" },
            { id: "NEW", label: "New" },
            { id: "RETURNING", label: "Returning" },
            { id: "HIGH_VALUE", label: "High Value" },
            { id: "INACTIVE", label: "Inactive" },
          ].map((tab) => {
            const isActive = activeSegment === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSegmentChange(tab.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full md:w-60">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button type="submit" size="xs" variant="outline" className="h-8 px-2.5 text-xs">
            Search
          </Button>
        </form>
      </div>

      {/* Canonical Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {data.items.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="No customers found"
              description="No customer records match your filter criteria. When store visitors checkout, profiles appear here automatically."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortChange("name")}
                >
                  <div className="flex items-center gap-1">
                    Customer <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortChange("orders_count")}
                >
                  <div className="flex items-center gap-1">
                    Orders <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortChange("total_spent")}
                >
                  <div className="flex items-center gap-1">
                    Lifetime Spend <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSortChange("last_order_at")}
                >
                  <div className="flex items-center gap-1">
                    Last Order <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => (
                <TableRow key={c.id}>
                  {/* Name */}
                  <TableCell>
                    <Link
                      href={`/dashboard/customers/${c.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors block"
                    >
                      {c.fullName}
                    </Link>
                    <span className="text-[11px] text-muted-foreground font-tabular">
                      Added {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </TableCell>

                  {/* Contact */}
                  <TableCell>
                    <div className="space-y-0.5">
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-foreground">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[160px]">{c.email}</span>
                        </div>
                      )}
                      {c.phone && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                      {!c.email && !c.phone && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>

                  {/* Segment */}
                  <TableCell>{renderSegmentBadge(c.segment)}</TableCell>

                  {/* Orders */}
                  <TableCell className="font-medium text-foreground font-tabular">{c.ordersCount}</TableCell>

                  {/* Lifetime Spend */}
                  <TableCell className="font-medium text-foreground font-tabular">{c.totalSpentFormatted}</TableCell>

                  {/* Last Order */}
                  <TableCell className="text-muted-foreground text-xs font-tabular">
                    {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : "—"}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Badge
                      variant={
                        c.status === "ACTIVE"
                          ? "success"
                          : c.status === "ARCHIVED"
                            ? "neutral"
                            : "warning"
                      }
                      dot
                    >
                      {c.status}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border text-xs">
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-2">
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            View 360 Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleArchive(c.id)}
                          className="text-rose-600 dark:text-rose-400 cursor-pointer flex items-center gap-2"
                        >
                          <Archive className="h-3.5 w-3.5" />
                          Archive Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
          <div>
            Showing <span className="font-medium text-foreground font-tabular">{(data.page - 1) * data.pageSize + 1}</span> to{" "}
            <span className="font-medium text-foreground font-tabular">{Math.min(data.page * data.pageSize, data.totalCount)}</span> of{" "}
            <span className="font-medium text-foreground font-tabular">{data.totalCount}</span> customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              disabled={data.page <= 1 || isPending}
              onClick={() => updateQuery({ page: String(data.page - 1) })}
            >
              Previous
            </Button>
            <span className="font-mono text-[11px] font-tabular">
              {data.page} / {data.totalPages}
            </span>
            <Button
              size="xs"
              variant="outline"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => updateQuery({ page: String(data.page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Create Customer Dialog */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <UserPlus className="h-4 w-4 text-primary" />
              Add Customer Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a store-scoped customer record. Either email or phone is required.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="rounded-md bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-700 dark:text-rose-400">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateCustomerSubmit} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-foreground">First Name *</label>
                <Input
                  type="text"
                  required
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="e.g. Aarav"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-foreground">Last Name</label>
                <Input
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Email Address</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. aarav@example.com"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Phone Number</label>
              <Input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-foreground">Internal Notes</label>
              <Input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="VIP customer, preferences, etc."
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreating}
              >
                {isCreating ? "Saving Customer..." : "Create Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
