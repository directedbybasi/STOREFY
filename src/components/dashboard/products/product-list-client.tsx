"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  Download,
  Upload,
  MoreHorizontal,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Trash2,
  FolderTree,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatINR,
  type ProductListItem,
  type Category,
  type CollectionListItem,
} from "@/modules/catalog";
import {
  deleteProductAction,
  changeProductStatusAction,
  bulkProductAction,
  exportProductsCsvAction,
  importProductsCsvAction,
} from "@/modules/catalog";

interface ProductListClientProps {
  initialProducts: ProductListItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  categories: Category[];
  collections: CollectionListItem[];
}

export function ProductListClient({
  initialProducts,
  pagination,
  categories,
  collections,
}: ProductListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [activeStatusTab, setActiveStatusTab] = useState<string>(
    searchParams.get("status") || "ALL"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(
    searchParams.get("categoryId") || ""
  );
  const [selectedCollection, setSelectedCollection] = useState<string>(
    searchParams.get("collectionId") || ""
  );
  const [selectedSort, setSelectedSort] = useState<string>(
    searchParams.get("sort") || "newest"
  );

  // Import Modal State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importFileName, setImportFileName] = useState<string>("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Bulk Category/Collection Assign Dialog
  const [bulkCategoryModalOpen, setBulkCategoryModalOpen] = useState(false);
  const [targetBulkCategory, setTargetBulkCategory] = useState("");
  const [bulkActionFeedback, setBulkActionFeedback] = useState<string | null>(null);

  const applyFilters = (overrides: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams(searchParams.toString());
    const current = {
      search: searchQuery,
      status: activeStatusTab === "ALL" ? undefined : activeStatusTab,
      categoryId: selectedCategory || undefined,
      collectionId: selectedCollection || undefined,
      sort: selectedSort,
      page: "1",
      ...overrides,
    };

    Object.entries(current).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });

    startTransition(() => {
      router.push(`/dashboard/products?${params.toString()}`);
    });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(initialProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Operations
  const handleBulkAction = async (
    action: "PUBLISH" | "UNPUBLISH" | "ARCHIVE" | "DELETE" | "SET_CATEGORY" | "ADD_TO_COLLECTION",
    categoryId?: string
  ) => {
    if (selectedIds.length === 0) return;
    if (action === "DELETE") {
      if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} product(s)?`)) {
        return;
      }
    }

    startTransition(async () => {
      try {
        const res = await bulkProductAction({
          action,
          productIds: selectedIds,
          categoryId,
        });
        setSelectedIds([]);
        setBulkActionFeedback(res.message);
        setTimeout(() => setBulkActionFeedback(null), 4000);
        router.refresh();
      } catch (err: unknown) {
        const error = err as Error;
        alert(`Bulk action failed: ${error.message}`);
      }
    });
  };

  // CSV Export
  const handleExportCsv = async () => {
    startTransition(async () => {
      try {
        const csvString = await exportProductsCsvAction();
        const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `products-export-${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err: unknown) {
        const error = err as Error;
        alert(`CSV export failed: ${error.message}`);
      }
    });
  };

  // CSV Import File Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportErrors([]);
    setImportSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setImportFileContent(content);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importFileContent) return;
    setIsImporting(true);
    setImportErrors([]);
    setImportSuccessMsg(null);

    try {
      const result = await importProductsCsvAction(importFileContent);
      if (result.success) {
        setImportSuccessMsg(`Successfully imported ${result.importedCount} products.`);
        setTimeout(() => {
          setImportModalOpen(false);
          setImportFileContent(null);
          setImportFileName("");
          router.refresh();
        }, 1500);
      } else {
        setImportErrors(result.errors);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setImportErrors([error.message]);
    } finally {
      setIsImporting(false);
    }
  };

  const isAllSelected =
    initialProducts.length > 0 && selectedIds.length === initialProducts.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < initialProducts.length;

  return (
    <div className="space-y-6">
      {/* Action Toast Feedback */}
      {bulkActionFeedback && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{bulkActionFeedback}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
            Products
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your store merchandise, variants, pricing, and inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={isPending}
            className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportModalOpen(true)}
            disabled={isPending}
            className="border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Import CSV
          </Button>

          <Button
            size="sm"
            asChild
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm"
          >
            <Link href="/dashboard/products/new" prefetch={true}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 pb-px">
        {[
          { label: "All Products", value: "ALL" },
          { label: "Active", value: "ACTIVE" },
          { label: "Draft", value: "DRAFT" },
          { label: "Archived", value: "ARCHIVED" },
        ].map((tab) => {
          const isActive = activeStatusTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => {
                setActiveStatusTab(tab.value);
                applyFilters({
                  status: tab.value === "ALL" ? undefined : tab.value,
                });
              }}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-indigo-500 text-indigo-400 font-semibold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-5 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search products by title or SKU..."
            className="pl-9 bg-slate-900/60 border-slate-800 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              applyFilters({ categoryId: e.target.value || undefined });
            }}
            aria-label="Filter by category"
            className="w-full h-9 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={selectedCollection}
            onChange={(e) => {
              setSelectedCollection(e.target.value);
              applyFilters({ collectionId: e.target.value || undefined });
            }}
            aria-label="Filter by collection"
            className="w-full h-9 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Collections</option>
            {collections.map((col) => (
              <option key={col.id} value={col.id}>
                {col.title}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={selectedSort}
            onChange={(e) => {
              setSelectedSort(e.target.value);
              applyFilters({ sort: e.target.value });
            }}
            aria-label="Sort products"
            className="w-full h-9 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="newest">Newest Added</option>
            <option value="oldest">Oldest Added</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="title-asc">Title: A–Z</option>
            <option value="title-desc">Title: Z–A</option>
          </select>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/95 border border-indigo-500/40 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
              {selectedIds.length}
            </span>
            <span className="text-xs font-medium text-slate-200">
              product{selectedIds.length > 1 ? "s" : ""} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("PUBLISH")}
              disabled={isPending}
              className="border-emerald-500/30 bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/40 text-xs h-8"
            >
              Publish
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("UNPUBLISH")}
              disabled={isPending}
              className="border-amber-500/30 bg-amber-950/20 text-amber-400 hover:bg-amber-950/40 text-xs h-8"
            >
              Unpublish
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction("ARCHIVE")}
              disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs h-8"
            >
              Archive
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkCategoryModalOpen(true)}
              disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs h-8"
            >
              Set Category
            </Button>

            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBulkAction("DELETE")}
              disabled={isPending}
              className="bg-red-600/90 hover:bg-red-600 text-white text-xs h-8"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white text-xs h-8"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-medium">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isPartiallySelected;
                    }}
                    onChange={handleSelectAll}
                    aria-label="Select all products"
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:outline-none"
                  />
                </th>
                <th className="py-3 px-3 w-14">Media</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Variants</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {initialProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    <Package className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-sm font-medium text-slate-300">No products found</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      No products match your active search or filter criteria. Create your
                      first product or clear filters to view items.
                    </p>
                    <Button
                      size="sm"
                      asChild
                      className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                    >
                      <Link href="/dashboard/products/new" prefetch={true}>Add Product</Link>
                    </Button>
                  </td>
                </tr>
              ) : (
                initialProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  return (
                    <tr
                      key={product.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-indigo-950/20" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(product.id)}
                          aria-label={`Select ${product.title}`}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 focus:outline-none"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="h-10 w-10 rounded-lg border border-slate-800 bg-slate-800/60 overflow-hidden flex items-center justify-center shrink-0">
                          {product.primaryImage ? (
                            <img
                              src={product.primaryImage}
                              alt={product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-slate-600" />
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Link
                          href={`/dashboard/products/${product.id}`}
                          prefetch={true}
                          className="font-medium text-slate-100 hover:text-indigo-400 transition"
                        >
                          {product.title}
                        </Link>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          /{product.slug}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        {product.status === "ACTIVE" && (
                          <Badge className="bg-emerald-950/40 text-emerald-400 border-emerald-500/30 text-[10px] font-medium">
                            Active
                          </Badge>
                        )}
                        {product.status === "DRAFT" && (
                          <Badge className="bg-amber-950/40 text-amber-400 border-amber-500/30 text-[10px] font-medium">
                            Draft
                          </Badge>
                        )}
                        {product.status === "ARCHIVED" && (
                          <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] font-medium">
                            Archived
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-200">
                        {formatINR(product.basePrice)}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {product.sku || "—"}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {product.categoryName ? (
                          <span className="inline-flex items-center gap-1">
                            <FolderTree className="h-3 w-3 text-slate-500" />
                            {product.categoryName}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        <Badge
                          variant="outline"
                          className="border-slate-800 bg-slate-900 text-slate-300 text-[10px]"
                        >
                          {product.variantCount} variant{product.variantCount !== 1 ? "s" : ""}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-40 border-slate-800 bg-slate-900 text-slate-300 text-xs"
                          >
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/products/${product.id}`}>
                                Edit Product
                              </Link>
                            </DropdownMenuItem>

                            {product.status === "ACTIVE" && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={`/products/${product.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View on Store
                                  <ExternalLink className="ml-auto h-3 w-3 text-slate-500" />
                                </a>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-slate-800" />

                            {product.status !== "ACTIVE" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  changeProductStatusAction(product.id, "ACTIVE").then(() =>
                                    router.refresh()
                                  )
                                }
                              >
                                Set as Active
                              </DropdownMenuItem>
                            )}

                            {product.status !== "DRAFT" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  changeProductStatusAction(product.id, "DRAFT").then(() =>
                                    router.refresh()
                                  )
                                }
                              >
                                Set as Draft
                              </DropdownMenuItem>
                            )}

                            {product.status !== "ARCHIVED" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  changeProductStatusAction(product.id, "ARCHIVED").then(() =>
                                    router.refresh()
                                  )
                                }
                              >
                                Archive
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator className="bg-slate-800" />

                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`Permanently delete "${product.title}"?`)) {
                                  deleteProductAction(product.id).then(() => router.refresh());
                                }
                              }}
                              className="text-red-400 focus:text-red-300"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 bg-slate-900/60 text-xs text-slate-400">
            <div>
              Showing{" "}
              <span className="font-semibold text-slate-200">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-200">
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-200">{pagination.totalCount}</span>{" "}
              products
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || isPending}
                onClick={() => applyFilters({ page: String(pagination.page - 1) })}
                className="border-slate-800 bg-slate-900 text-slate-300 text-xs h-8"
              >
                Previous
              </Button>
              <span className="px-2 font-mono text-[11px] text-slate-400">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || isPending}
                onClick={() => applyFilters({ page: String(pagination.page + 1) })}
                className="border-slate-800 bg-slate-900 text-slate-300 text-xs h-8"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Import Products from CSV
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Upload a standard CSV catalog file. STOREFY validates all rows, handles variants,
              and commits valid products transactionally.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center bg-slate-950/40 hover:border-indigo-500 transition cursor-pointer">
              <Upload className="mx-auto h-8 w-8 text-slate-500 mb-2" />
              <p className="text-xs text-slate-300 font-medium">
                {importFileName || "Click or drag your CSV file here"}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Must include Title and Price columns. Max 5MB.
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="mt-3 inline-flex px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer"
              >
                Select File
              </label>
            </div>

            {importErrors.length > 0 && (
              <div className="max-h-44 overflow-y-auto p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs space-y-1">
                <div className="flex items-center gap-1 font-semibold text-red-400">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>Import Validation Errors ({importErrors.length}):</span>
                </div>
                {importErrors.map((err, idx) => (
                  <p key={idx} className="font-mono text-[11px] pl-5">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!importFileContent || isImporting}
              onClick={handleConfirmImport}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Validating & Importing...
                </>
              ) : (
                "Import Products"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Set Category Modal */}
      <Dialog open={bulkCategoryModalOpen} onOpenChange={setBulkCategoryModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              Assign Category in Bulk
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Assign {selectedIds.length} selected product(s) to a category.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-xs text-slate-300 block mb-2">Select Category</label>
            <select
              value={targetBulkCategory}
              onChange={(e) => setTargetBulkCategory(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">None (Clear Category)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkCategoryModalOpen(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setBulkCategoryModalOpen(false);
                handleBulkAction("SET_CATEGORY", targetBulkCategory || undefined);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              Apply Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
