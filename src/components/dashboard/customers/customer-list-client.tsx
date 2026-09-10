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
  Sparkles,
  ExternalLink,
  Archive,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

  function handleSortChange(sort: string) {
    const newOrder = activeSort === sort && sortOrder === "desc" ? "asc" : "desc";
    setActiveSort(sort);
    setSortOrder(newOrder);
    updateQuery({ sortBy: sort, sortOrder: newOrder });
  }

  async function handleCreateCustomerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newFirstName.trim()) {
      setCreateError("First name is required.");
      return;
    }
    if (!newEmail.trim() && !newPhone.trim()) {
      setCreateError("Please provide at least an email address or a phone number.");
      return;
    }

    setCreateError(null);
    setIsCreating(true);
    try {
      await createCustomerAction({
        firstName: newFirstName.trim(),
        lastName: newLastName.trim() || undefined,
        email: newEmail.trim() || undefined,
        phone: newPhone.trim() || undefined,
        status: newStatus,
        notes: newNotes.trim() || undefined,
      });

      setCreateModalOpen(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPhone("");
      setNewNotes("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create customer";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleArchive(customerId: string) {
    if (!confirm("Are you sure you want to archive this customer?")) return;
    try {
      await archiveCustomerAction(customerId);
      router.refresh();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to archive customer");
    }
  }

  function renderSegmentBadge(segment: CustomerSegment) {
    switch (segment) {
      case "HIGH_VALUE":
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-950/40 text-amber-300 text-[10px] font-semibold flex items-center gap-1 w-fit">
            <Award className="h-3 w-3 text-amber-400" /> High Value
          </Badge>
        );
      case "RETURNING":
        return (
          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-950/40 text-indigo-300 text-[10px] flex items-center gap-1 w-fit">
            <Sparkles className="h-3 w-3 text-indigo-400" /> Returning
          </Badge>
        );
      case "INACTIVE":
        return (
          <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-400 text-[10px] flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3 text-slate-400" /> Inactive
          </Badge>
        );
      case "NEW":
      default:
        return (
          <Badge variant="outline" className="border-cyan-500/40 bg-cyan-950/40 text-cyan-300 text-[10px] flex items-center gap-1 w-fit">
            <UserPlus className="h-3 w-3 text-cyan-400" /> New
          </Badge>
        );
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" />
            Customer Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Store-scoped CRM profiles, addresses, canonical segmentations, and real lifetime order metrics.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setCreateError(null);
            setCreateModalOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-sm"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Customer
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Customers</span>
          <p className="text-xl font-bold text-white mt-1">{data.summary.totalCustomers}</p>
        </div>
        <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Active
          </span>
          <p className="text-xl font-bold text-emerald-300 mt-1">{data.summary.activeCount}</p>
        </div>
        <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <UserPlus className="h-3 w-3" /> New
          </span>
          <p className="text-xl font-bold text-cyan-300 mt-1">{data.summary.newCount}</p>
        </div>
        <div className="rounded-xl border border-indigo-900/40 bg-indigo-950/20 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-indigo-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Returning
          </span>
          <p className="text-xl font-bold text-indigo-300 mt-1">{data.summary.returningCount}</p>
        </div>
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Award className="h-3 w-3" /> High Value
          </span>
          <p className="text-xl font-bold text-amber-300 mt-1">{data.summary.highValueCount}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 shadow-sm">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="h-3 w-3" /> Inactive
          </span>
          <p className="text-xl font-bold text-slate-400 mt-1">{data.summary.inactiveCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        {/* Segment Filter Tabs */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: "ALL", label: "All Segments" },
            { id: "NEW", label: "New" },
            { id: "RETURNING", label: "Returning" },
            { id: "HIGH_VALUE", label: "High Value" },
            { id: "INACTIVE", label: "Inactive" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleSegmentChange(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeSegment === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              type="text"
              placeholder="Search name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-500 h-8"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700">
            Search
          </Button>
        </form>
      </div>

      {/* Customers Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSortChange("name")}>
                  <div className="flex items-center gap-1">
                    Customer <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3">Contact</th>
                <th className="p-3">Segment</th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSortChange("orders_count")}>
                  <div className="flex items-center gap-1">
                    Orders <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSortChange("total_spent")}>
                  <div className="flex items-center gap-1 text-emerald-400">
                    Lifetime Spend <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3 cursor-pointer select-none" onClick={() => handleSortChange("last_order_at")}>
                  <div className="flex items-center gap-1">
                    Last Order <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No customers found matching the filters.
                  </td>
                </tr>
              ) : (
                data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Name */}
                    <td className="p-3">
                      <Link
                        href={`/dashboard/customers/${c.id}`}
                        className="font-medium text-white hover:text-indigo-400 transition-colors block"
                      >
                        {c.fullName}
                      </Link>
                      <span className="text-[10px] text-slate-500">
                        Added {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="p-3">
                      <div className="space-y-0.5">
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="h-3 w-3 text-slate-500" />
                            <span className="truncate max-w-[180px]">{c.email}</span>
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone className="h-3 w-3 text-slate-500" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                        {!c.email && !c.phone && <span className="text-slate-600">—</span>}
                      </div>
                    </td>

                    {/* Segment */}
                    <td className="p-3">{renderSegmentBadge(c.segment)}</td>

                    {/* Orders */}
                    <td className="p-3 font-semibold text-slate-200">{c.ordersCount}</td>

                    {/* Lifetime Spend */}
                    <td className="p-3 font-bold text-emerald-400">{c.totalSpentFormatted}</td>

                    {/* Last Order */}
                    <td className="p-3 text-slate-400">
                      {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : "No orders yet"}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          c.status === "ACTIVE"
                            ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[10px]"
                            : c.status === "ARCHIVED"
                            ? "border-slate-700 bg-slate-800 text-slate-400 text-[10px]"
                            : "border-amber-500/30 bg-amber-950/40 text-amber-300 text-[10px]"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-white">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-900 border-slate-800 text-xs">
                          <DropdownMenuItem asChild className="hover:bg-slate-800 cursor-pointer">
                            <Link href={`/dashboard/customers/${c.id}`} className="flex items-center gap-2">
                              <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                              View 360 Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-800" />
                          <DropdownMenuItem
                            onClick={() => handleArchive(c.id)}
                            className="text-rose-400 hover:bg-rose-950/30 cursor-pointer flex items-center gap-2"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Archive Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
          <div>
            Showing {(data.page - 1) * data.pageSize + 1} to{" "}
            {Math.min(data.page * data.pageSize, data.totalCount)} of {data.totalCount} customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-slate-800"
              disabled={data.page <= 1 || isPending}
              onClick={() => updateQuery({ page: String(data.page - 1) })}
            >
              Previous
            </Button>
            <span className="text-slate-300 font-medium px-2">
              Page {data.page} of {data.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-slate-800"
              disabled={data.page >= data.totalPages || isPending}
              onClick={() => updateQuery({ page: String(data.page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* CREATE CUSTOMER DIALOG */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-400" />
              Add Customer Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Create a store-scoped customer record. Either email or phone is required.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="rounded-lg bg-rose-950/50 border border-rose-800 p-2.5 text-xs text-rose-300">
              {createError}
            </div>
          )}

          <form onSubmit={handleCreateCustomerSubmit} className="space-y-3.5 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-medium text-slate-300">First Name *</label>
                <Input
                  type="text"
                  required
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  placeholder="e.g. Aarav"
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-300">Last Name</label>
                <Input
                  type="text"
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  placeholder="e.g. Sharma"
                  className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Email Address</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. aarav@example.com"
                className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Phone Number</label>
              <Input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-300">Internal Merchant Notes</label>
              <Input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="VIP customer, preferred shipping, etc."
                className="h-8 bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
                onClick={() => setCreateModalOpen(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
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
