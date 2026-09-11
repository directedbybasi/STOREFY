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
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === initialProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(initialProducts.map((p) => p.id));
    }
  };

  const handleBulkAction = (
    action: "PUBLISH" | "UNPUBLISH" | "ARCHIVE" | "DELETE" | "SET_CATEGORY",
    value?: string
  ) => {
    if (selectedIds.length === 0) return;

    if (action === "DELETE" && !confirm(`Permanently delete ${selectedIds.length} products?`)) {
      return;
    }

    startTransition(async () => {
      const res = await bulkProductAction({
        productIds: selectedIds,
        action,
        categoryId: action === "SET_CATEGORY" ? value : undefined,
      });

      if (res.success) {
        setBulkActionFeedback(`Updated ${res.count} products.`);
        setSelectedIds([]);
        router.refresh();
        setTimeout(() => setBulkActionFeedback(null), 3000);
      }
    });
  };

  const handleExportCsv = async () => {
    startTransition(async () => {
      const csv = await exportProductsCsvAction();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `products_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
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
    <div className="space-y-5">
      {/* Action Toast Feedback */}
      {bulkActionFeedback && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{bulkActionFeedback}</span>
        </div>
      )}

      {/* Canonical Page Header */}
      <PageHeader
        title="Products"
        description="Manage your catalog, SKUs, variants, pricing, and inventory."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isPending}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportModalOpen(true)}
              disabled={isPending}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Import CSV
            </Button>

            <Button size="sm" asChild>
              <Link href="/dashboard/products/new" prefetch={true}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Product
              </Link>
            </Button>
          </div>
        }
      />

      {/* Status Tabs */}
      <div className="flex items-center gap-1 border-b border-border/80 pb-px">
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
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-6 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search products by title or SKU..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="sm:col-span-2">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              applyFilters({ categoryId: e.target.value || undefined });
            }}
            aria-label="Filter by category"
            className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1.5 focus:ring-ring"
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
            className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1.5 focus:ring-ring"
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
            className="w-full h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1.5 focus:ring-ring"
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

      {/* Contextual Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-lg border border-primary/30 bg-primary/5 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 items-center justify-center rounded bg-primary/20 px-2 text-[11px] font-semibold text-primary font-tabular">
              {selectedIds.length} selected
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="xs"
              variant="outline"
              onClick={() => handleBulkAction("PUBLISH")}
              disabled={isPending}
            >
              Publish
            </Button>

            <Button
              size="xs"
              variant="outline"
              onClick={() => handleBulkAction("UNPUBLISH")}
              disabled={isPending}
            >
              Unpublish
            </Button>

            <Button
              size="xs"
              variant="outline"
              onClick={() => handleBulkAction("ARCHIVE")}
              disabled={isPending}
            >
              Archive
            </Button>

            <Button
              size="xs"
              variant="outline"
              onClick={() => setBulkCategoryModalOpen(true)}
              disabled={isPending}
            >
              Set Category
            </Button>

            <Button
              size="xs"
              variant="destructive"
              onClick={() => handleBulkAction("DELETE")}
              disabled={isPending}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Delete
            </Button>

            <Button
              size="xs"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Deselect
            </Button>
          </div>
        </div>
      )}

      {/* Canonical Products Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {initialProducts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Package}
              title="No products found"
              description="No catalog items match your active search or filters. Create a new product or reset your filters."
              action={
                <Button size="sm" asChild>
                  <Link href="/dashboard/products/new" prefetch={true}>
                    Add Product
                  </Link>
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isPartiallySelected;
                    }}
                    onChange={handleSelectAll}
                    aria-label="Select all products"
                    className="rounded border-input text-primary focus:ring-0 focus:outline-none"
                  />
                </TableHead>
                <TableHead className="w-12">Media</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {initialProducts.map((product) => {
                const isSelected = selectedIds.includes(product.id);
                return (
                  <TableRow
                    key={product.id}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(product.id)}
                        aria-label={`Select ${product.title}`}
                        className="rounded border-input text-primary focus:ring-0 focus:outline-none"
                      />
                    </TableCell>

                    <TableCell>
                      <div className="h-9 w-9 rounded-md border border-border bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
                        {product.primaryImage ? (
                          <img
                            src={product.primaryImage}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/60" />
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        prefetch={true}
                        className="font-medium text-foreground hover:text-primary transition-colors block truncate max-w-[200px]"
                      >
                        {product.title}
                      </Link>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate max-w-[200px]">
                        /{product.slug}
                      </p>
                    </TableCell>

                    <TableCell>
                      {product.status === "ACTIVE" && (
                        <Badge variant="success" dot>
                          Active
                        </Badge>
                      )}
                      {product.status === "DRAFT" && (
                        <Badge variant="warning" dot>
                          Draft
                        </Badge>
                      )}
                      {product.status === "ARCHIVED" && (
                        <Badge variant="neutral" dot>
                          Archived
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="font-medium text-foreground font-tabular">
                      {formatINR(product.basePrice)}
                    </TableCell>

                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {product.sku || "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs">
                      {product.categoryName ? (
                        <span className="inline-flex items-center gap-1">
                          <FolderTree className="h-3 w-3 text-muted-foreground/70" />
                          {product.categoryName}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {product.variantCount} variant{product.variantCount !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 bg-popover border-border">
                          <DropdownMenuItem asChild className="cursor-pointer text-xs">
                            <Link href={`/dashboard/products/${product.id}`}>
                              Edit Product
                            </Link>
                          </DropdownMenuItem>

                          {product.status === "ACTIVE" && (
                            <DropdownMenuItem asChild className="cursor-pointer text-xs">
                              <a
                                href={`/products/${product.slug}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View on Store
                                <ExternalLink className="ml-auto h-3 w-3 text-muted-foreground" />
                              </a>
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          {product.status !== "ACTIVE" && (
                            <DropdownMenuItem
                              className="cursor-pointer text-xs"
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
                              className="cursor-pointer text-xs"
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
                              className="cursor-pointer text-xs"
                              onClick={() =>
                                changeProductStatusAction(product.id, "ARCHIVED").then(() =>
                                  router.refresh()
                                )
                              }
                            >
                              Archive
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm(`Permanently delete "${product.title}"?`)) {
                                deleteProductAction(product.id).then(() => router.refresh());
                              }
                            }}
                            className="text-rose-600 dark:text-rose-400 focus:text-rose-600 cursor-pointer text-xs"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Section 88: Subtle Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing{" "}
              <span className="font-medium text-foreground font-tabular">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground font-tabular">
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground font-tabular">{pagination.totalCount}</span>{" "}
              items
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                disabled={pagination.page <= 1 || isPending}
                onClick={() => applyFilters({ page: String(pagination.page - 1) })}
              >
                Previous
              </Button>
              <span className="font-mono text-[11px] font-tabular">
                {pagination.page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="xs"
                disabled={pagination.page >= pagination.totalPages || isPending}
                onClick={() => applyFilters({ page: String(pagination.page + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* CSV Import Modal */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Import Products from CSV
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload a standard CSV catalog file. Rows are validated and committed transactionally.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/20 hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="mx-auto h-7 w-7 text-muted-foreground mb-2" />
              <p className="text-xs text-foreground font-medium">
                {importFileName || "Click or drag your CSV file here"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Must include Title and Price columns. Maximum 5MB.
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
                className="mt-3 inline-flex px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted text-foreground text-xs cursor-pointer"
              >
                Select File
              </label>
            </div>

            {importErrors.length > 0 && (
              <div className="max-h-40 overflow-y-auto p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs space-y-1">
                <div className="flex items-center gap-1 font-semibold">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>Validation Errors ({importErrors.length}):</span>
                </div>
                {importErrors.map((err, idx) => (
                  <p key={idx} className="font-mono text-[11px] pl-5">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            {importSuccessMsg && (
              <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
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
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!importFileContent || isImporting}
              onClick={handleConfirmImport}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Products"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Category Modal */}
      <Dialog open={bulkCategoryModalOpen} onOpenChange={setBulkCategoryModalOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              Assign Category in Bulk
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Assign {selectedIds.length} selected product(s) to a category.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3">
            <label className="text-xs text-muted-foreground block mb-1.5 font-medium">Select Category</label>
            <select
              value={targetBulkCategory}
              onChange={(e) => setTargetBulkCategory(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1.5 focus:ring-ring"
            >
              <option value="">None (Clear Category)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkCategoryModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setBulkCategoryModalOpen(false);
                handleBulkAction("SET_CATEGORY", targetBulkCategory || undefined);
              }}
            >
              Apply Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
