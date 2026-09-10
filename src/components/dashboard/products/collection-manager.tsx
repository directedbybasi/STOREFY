"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Layers,
  Plus,
  ArrowLeft,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCollectionAction,
  updateCollectionAction,
  deleteCollectionAction,
  slugify,
  type CollectionListItem,
  type ProductListItem,
} from "@/modules/catalog";

interface CollectionManagerProps {
  collections: CollectionListItem[];
  allProducts: ProductListItem[];
}

export function CollectionManager({
  collections,
  allProducts,
}: CollectionManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionListItem | null>(
    null
  );

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCollection(null);
    setTitle("");
    setSlug("");
    setDescription("");
    setImageUrl("");
    setIsActive(true);
    setSelectedProductIds([]);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (col: CollectionListItem) => {
    setEditingCollection(col);
    setTitle(col.title);
    setSlug(col.slug);
    setDescription(col.description || "");
    setImageUrl(col.imageUrl || "");
    setIsActive(col.isActive);
    setSelectedProductIds([]); // will allow re-selecting
    setErrorMsg(null);
    setModalOpen(true);
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg("Collection title is required.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      try {
        if (editingCollection) {
          await updateCollectionAction(editingCollection.id, {
            title,
            slug: slug ? slugify(slug) : undefined,
            description: description || null,
            imageUrl: imageUrl || null,
            isActive,
            productIds: selectedProductIds,
          });
          setSuccessMsg("Collection updated successfully.");
        } else {
          await createCollectionAction({
            title,
            slug: slug ? slugify(slug) : undefined,
            description: description || null,
            imageUrl: imageUrl || null,
            isActive,
            productIds: selectedProductIds,
          });
          setSuccessMsg("Collection created successfully.");
        }

        setTimeout(() => setSuccessMsg(null), 3000);
        setModalOpen(false);
        router.refresh();
      } catch (err: unknown) {
        const error = err as Error;
        setErrorMsg(error.message);
      }
    });
  };

  const handleDelete = async (col: CollectionListItem) => {
    if (confirm(`Delete collection "${col.title}"? This will not delete the assigned products.`)) {
      startTransition(async () => {
        try {
          await deleteCollectionAction(col.id);
          router.refresh();
        } catch (err: unknown) {
          const error = err as Error;
          alert(`Delete failed: ${error.message}`);
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 px-2 text-slate-400 hover:text-white"
          >
            <Link href="/dashboard/products">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Products
            </Link>
          </Button>
          <div className="h-4 w-px bg-slate-800" />
          <h1 className="text-xl font-bold text-white">Collections</h1>
        </div>

        <Button
          size="sm"
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Collection
        </Button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Collections List Card */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white">All Collections</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Group products into curated themes, sales, and seasonal catalogs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {collections.length === 0 ? (
            <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
              <Layers className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-300">No collections created yet</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Create promotional and seasonal collections to showcase on your homepage.
              </p>
              <Button
                size="sm"
                onClick={openCreateModal}
                className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                Create First Collection
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between py-3 px-2 hover:bg-slate-800/30 rounded-lg transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
                      {col.imageUrl ? (
                        <img
                          src={col.imageUrl}
                          alt={col.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Layers className="h-4 w-4 text-slate-600" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{col.title}</span>
                        {col.isActive ? (
                          <Badge className="bg-emerald-950/40 text-emerald-400 border-emerald-500/30 text-[9px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[9px]">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        /collections/{col.slug} • {col.productsCount} product
                        {col.productsCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {col.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-slate-400 hover:text-white h-7 w-7 p-0"
                      >
                        <a
                          href={`/collections/${col.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="View on Store"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(col)}
                      className="text-slate-400 hover:text-white h-7 w-7 p-0"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(col)}
                      className="text-slate-400 hover:text-red-400 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              {editingCollection ? "Edit Collection" : "New Collection"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Curate products into targeted collections for campaigns and themes.
            </DialogDescription>
          </DialogHeader>

          {errorMsg && (
            <div className="p-2.5 rounded bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-4 py-2 text-xs">
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!editingCollection) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Summer Essentials, Featured Bestsellers"
                className="bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Handle / Slug</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="summer-essentials"
                className="bg-slate-950 border-slate-800 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Overview of this collection for buyers and SEO"
                className="w-full rounded-md border border-slate-800 bg-slate-950 p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Banner Image URL</label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            {/* Product Assignment Picker */}
            <div>
              <label className="text-slate-300 font-medium block mb-1.5">
                Assign Products ({selectedProductIds.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-2 space-y-1">
                {allProducts.length === 0 ? (
                  <p className="text-slate-500 text-[11px] p-2">No products available to assign.</p>
                ) : (
                  allProducts.map((p) => {
                    const isChecked = selectedProductIds.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProduct(p.id)}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                        />
                        <span className="text-slate-200 font-medium">{p.title}</span>
                        <span className="text-slate-500 font-mono text-[10px] ml-auto">
                          {p.sku || ""}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="border-slate-700 text-slate-300 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
            >
              {isPending ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Collection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
