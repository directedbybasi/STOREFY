"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderTree,
  Plus,
  ArrowLeft,
  Folder,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  slugify,
  type Category,
  type CategoryTreeNode,
} from "@/modules/catalog";

interface CategoryManagerProps {
  categoriesTree: CategoryTreeNode[];
  flatCategories: Category[];
}

export function CategoryManager({
  categoriesTree,
  flatCategories,
}: CategoryManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openCreateModal = (presetParentId?: string) => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setParentId(presetParentId || "");
    setDescription("");
    setImageUrl("");
    setSeoTitle("");
    setSeoDescription("");
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setParentId(cat.parentId || "");
    setDescription(cat.description || "");
    setImageUrl(cat.imageUrl || "");
    setSeoTitle(cat.seoTitle || "");
    setSeoDescription(cat.seoDescription || "");
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMsg("Category name is required.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      try {
        if (editingCategory) {
          await updateCategoryAction(editingCategory.id, {
            name,
            slug: slug ? slugify(slug) : undefined,
            parentId: parentId || null,
            description: description || null,
            imageUrl: imageUrl || null,
            seoTitle: seoTitle || undefined,
            seoDescription: seoDescription || undefined,
          });
          setSuccessMsg("Category updated successfully.");
        } else {
          await createCategoryAction({
            name,
            slug: slug ? slugify(slug) : undefined,
            parentId: parentId || null,
            description: description || null,
            imageUrl: imageUrl || null,
            seoTitle: seoTitle || undefined,
            seoDescription: seoDescription || undefined,
          });
          setSuccessMsg("Category created successfully.");
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

  const handleDelete = async (cat: Category) => {
    if (confirm(`Delete category "${cat.name}"? Subcategories will be moved up to prevent orphaned nodes.`)) {
      startTransition(async () => {
        try {
          await deleteCategoryAction(cat.id);
          router.refresh();
        } catch (err: unknown) {
          const error = err as Error;
          alert(`Delete failed: ${error.message}`);
        }
      });
    }
  };

  // Render tree node recursively
  const renderTreeNode = (node: CategoryTreeNode, level = 0) => {
    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center justify-between p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/60 transition ${
            level > 0 ? "ml-6 border-l-2 border-l-indigo-500" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold text-white">{node.name}</span>
            <span className="text-[11px] text-slate-500 font-mono">/{node.slug}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openCreateModal(node.id)}
              className="text-slate-400 hover:text-white h-7 px-2 text-[11px]"
            >
              <Plus className="h-3 w-3 mr-1" />
              Subcategory
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(node)}
              className="text-slate-400 hover:text-white h-7 w-7 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(node)}
              className="text-slate-400 hover:text-red-400 h-7 w-7 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="space-y-1">
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
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
          <h1 className="text-xl font-bold text-white">Categories</h1>
        </div>

        <Button
          size="sm"
          onClick={() => openCreateModal()}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Category
        </Button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tree View */}
      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-white">
            Category Hierarchy
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Organize products into hierarchical categories (Parent → Child → Grandchild).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {categoriesTree.length === 0 ? (
            <div className="p-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
              <FolderTree className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-300">No categories created yet</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Create structured product categories to help customers navigate your store.
              </p>
              <Button
                size="sm"
                onClick={() => openCreateModal()}
                className="mt-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
              >
                Create First Category
              </Button>
            </div>
          ) : (
            categoriesTree.map((root) => renderTreeNode(root, 0))
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white">
              {editingCategory ? "Edit Category" : "New Category"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Categorize products to improve navigation and search on your store.
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
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editingCategory) setSlug(slugify(e.target.value));
                }}
                placeholder="e.g. Menswear, Electronics, Home Decor"
                className="bg-slate-950 border-slate-800 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Handle / Slug</label>
              <Input
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="menswear"
                className="bg-slate-950 border-slate-800 text-white text-xs font-mono"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Parent Category (Optional)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">None (Top-level Category)</option>
                {flatCategories
                  .filter((c) => !editingCategory || c.id !== editingCategory.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Category summary for storefront header and SEO"
                className="w-full rounded-md border border-slate-800 bg-slate-950 p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 font-medium block mb-1">Image URL</label>
              <Input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="bg-slate-950 border-slate-800 text-white text-xs"
              />
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
                "Save Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
