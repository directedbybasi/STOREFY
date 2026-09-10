"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  Trash2,
  Plus,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  MoveUp,
  MoveDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
  uploadProductImageAction,
  generateVariantMatrixAction,
  paiseToRupees,
  slugify,
  type Category,
  type CollectionListItem,
  type Product,
  type ProductVariant,
  type ProductImage,
} from "@/modules/catalog";

interface ProductFormProps {
  initialProduct?: Product;
  initialVariants?: ProductVariant[];
  initialImages?: ProductImage[];
  initialCollectionIds?: string[];
  categories: Category[];
  collections: CollectionListItem[];
  mode: "create" | "edit";
}

interface FormVariant {
  id?: string;
  title: string;
  sku?: string;
  barcode?: string;
  priceRupees: number;
  compareAtPriceRupees?: number;
  costPriceRupees?: number;
  option1?: string;
  option2?: string;
  option3?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

interface FormImage {
  id?: string;
  imageUrl: string;
  storagePath: string;
  altText?: string;
  sortOrder: number;
}

interface OptionDimensionState {
  name: string;
  valuesInput: string;
}

export function ProductForm({
  initialProduct,
  initialVariants = [],
  initialImages = [],
  initialCollectionIds = [],
  categories,
  collections,
  mode,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Basic Information
  const [title, setTitle] = useState(initialProduct?.title || "");
  const [slug, setSlug] = useState(initialProduct?.slug || "");
  const [description, setDescription] = useState(initialProduct?.description || "");
  const [shortDescription, setShortDescription] = useState(
    initialProduct?.shortDescription || ""
  );
  const [productType, setProductType] = useState(initialProduct?.productType || "");
  const [vendor, setVendor] = useState(initialProduct?.vendor || "");
  const [brand, setBrand] = useState(initialProduct?.brand || "");

  // Pricing
  const [basePriceRupees, setBasePriceRupees] = useState<number>(
    initialProduct ? paiseToRupees(initialProduct.basePrice) : 0
  );
  const [compareAtPriceRupees, setCompareAtPriceRupees] = useState<number | undefined>(
    initialProduct?.compareAtPrice ? paiseToRupees(initialProduct.compareAtPrice) : undefined
  );
  const [costPriceRupees, setCostPriceRupees] = useState<number | undefined>(
    initialProduct?.costPrice ? paiseToRupees(initialProduct.costPrice) : undefined
  );
  const [sku, setSku] = useState(initialProduct?.sku || "");
  const [barcode, setBarcode] = useState(initialProduct?.barcode || "");

  // Media
  const [images, setImages] = useState<FormImage[]>(
    initialImages.map((img, idx) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      storagePath: img.storagePath,
      altText: img.altText || "",
      sortOrder: img.sortOrder ?? idx,
    }))
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Variants
  const [hasVariants, setHasVariants] = useState<boolean>(
    initialVariants.length > 1 ||
      (initialVariants.length === 1 && initialVariants[0].title !== "Default Title")
  );
  const [optionDimensions, setOptionDimensions] = useState<OptionDimensionState[]>([
    { name: "Size", valuesInput: "S, M, L" },
    { name: "Color", valuesInput: "Black, White" },
  ]);
  const [variants, setVariants] = useState<FormVariant[]>(
    initialVariants.length > 0
      ? initialVariants.map((v, idx) => ({
          id: v.id,
          title: v.title,
          sku: v.sku || "",
          barcode: v.barcode || "",
          priceRupees: paiseToRupees(v.price),
          compareAtPriceRupees: v.compareAtPrice ? paiseToRupees(v.compareAtPrice) : undefined,
          costPriceRupees: v.costPrice ? paiseToRupees(v.costPrice) : undefined,
          option1: v.option1 || undefined,
          option2: v.option2 || undefined,
          option3: v.option3 || undefined,
          imageUrl: v.imageUrl || undefined,
          isActive: v.isActive ?? true,
          sortOrder: v.sortOrder ?? idx,
        }))
      : []
  );

  // Organization
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialProduct?.categoryId || ""
  );
  const [selectedCollections, setSelectedCollections] = useState<string[]>(
    initialCollectionIds
  );
  const [tagsInput, setTagsInput] = useState<string>(
    initialProduct?.tags ? initialProduct.tags.join(", ") : ""
  );

  // SEO
  const [seoTitle, setSeoTitle] = useState(initialProduct?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(
    initialProduct?.seoDescription || ""
  );

  // Status & Feedback
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">(
    (initialProduct?.status as "DRAFT" | "ACTIVE" | "ARCHIVED") || "DRAFT"
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Auto-generate slug from title if in create mode or slug is empty
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (mode === "create" || !slug) {
      setSlug(slugify(val));
    }
  };

  // Image Upload Handler via Server Action
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setFormError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      if (initialProduct?.id) {
        fd.append("productId", initialProduct.id);
      }

      const res = await uploadProductImageAction(fd);
      if (res.success) {
        setImages((prev) => [
          ...prev,
          {
            imageUrl: res.imageUrl,
            storagePath: res.storagePath,
            altText: title,
            sortOrder: prev.length,
          },
        ]);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(`Image upload failed: ${error.message}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === images.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const newImgs = [...images];
    const [moved] = newImgs.splice(index, 1);
    newImgs.splice(targetIdx, 0, moved);
    setImages(newImgs.map((img, idx) => ({ ...img, sortOrder: idx })));
  };

  // Variant Matrix Generation
  const handleGenerateMatrix = async () => {
    try {
      const dims = optionDimensions.map((d) => ({
        name: d.name,
        values: d.valuesInput.split(",").map((v) => v.trim()).filter(Boolean),
      }));

      const generated = await generateVariantMatrixAction(dims, basePriceRupees, sku);
      if (generated.length === 0) {
        setFormError("Please provide at least one option name with values.");
        return;
      }

      setVariants(
        generated.map((g, idx) => ({
          title: g.title,
          sku: g.sku || `${sku || "SKU"}-${idx + 1}`,
          priceRupees: g.priceRupees || basePriceRupees,
          compareAtPriceRupees: compareAtPriceRupees,
          costPriceRupees: costPriceRupees,
          option1: g.option1,
          option2: g.option2,
          option3: g.option3,
          isActive: true,
          sortOrder: idx,
        }))
      );
      setFormError(null);
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(`Failed to generate variants: ${error.message}`);
    }
  };

  const toggleCollection = (colId: string) => {
    setSelectedCollections((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  // Save / Publish
  const handleSave = async (publishImmediate = false) => {
    if (!title.trim()) {
      setFormError("Product title is required.");
      return;
    }

    if (basePriceRupees < 0) {
      setFormError("Base price cannot be negative.");
      return;
    }

    const targetStatus = publishImmediate ? "ACTIVE" : status;
    setFormError(null);
    setFormSuccess(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        if (mode === "create") {
          const res = await createProductAction({
            title,
            slug: slug ? slugify(slug) : undefined,
            description,
            shortDescription,
            productType: productType || undefined,
            vendor: vendor || undefined,
            brand: brand || undefined,
            categoryId: selectedCategory || undefined,
            collectionIds: selectedCollections,
            tags,
            basePriceRupees,
            compareAtPriceRupees: compareAtPriceRupees || undefined,
            costPriceRupees: costPriceRupees || undefined,
            sku: sku || undefined,
            barcode: barcode || undefined,
            status: targetStatus,
            seoTitle: seoTitle || undefined,
            seoDescription: seoDescription || undefined,
            variants: hasVariants ? variants : [],
            images,
          });

          setFormSuccess("Product created successfully!");
          setTimeout(() => {
            router.push(`/dashboard/products/${res.product.id}`);
          }, 1000);
        } else {
          await updateProductAction({
            id: initialProduct!.id,
            title,
            slug: slug ? slugify(slug) : undefined,
            description,
            shortDescription,
            productType: productType || undefined,
            vendor: vendor || undefined,
            brand: brand || undefined,
            categoryId: selectedCategory || undefined,
            collectionIds: selectedCollections,
            tags,
            basePriceRupees,
            compareAtPriceRupees: compareAtPriceRupees || undefined,
            costPriceRupees: costPriceRupees || undefined,
            sku: sku || undefined,
            barcode: barcode || undefined,
            status: targetStatus,
            seoTitle: seoTitle || undefined,
            seoDescription: seoDescription || undefined,
            variants: hasVariants ? variants : [],
            images,
          });

          setFormSuccess("Product updated successfully!");
          router.refresh();
        }
      } catch (err: unknown) {
        const error = err as Error;
        setFormError(error.message);
      }
    });
  };

  const handleDelete = async () => {
    if (!initialProduct?.id) return;
    if (confirm(`Permanently delete "${title}"? This action cannot be undone.`)) {
      startTransition(async () => {
        try {
          await deleteProductAction(initialProduct.id);
          router.push("/dashboard/products");
        } catch (err: unknown) {
          const error = err as Error;
          setFormError(`Delete failed: ${error.message}`);
        }
      });
    }
  };

  // Profit Margin calculation
  const profit =
    costPriceRupees !== undefined && costPriceRupees > 0
      ? basePriceRupees - costPriceRupees
      : null;
  const marginPercent =
    profit !== null && basePriceRupees > 0
      ? Math.round((profit / basePriceRupees) * 100)
      : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Action Bar */}
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
          <h1 className="text-xl font-bold text-white">
            {mode === "create" ? "Add New Product" : `Edit: ${title || "Product"}`}
          </h1>
          {initialProduct?.status && (
            <Badge
              className={
                initialProduct.status === "ACTIVE"
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30 text-[10px]"
                  : initialProduct.status === "DRAFT"
                  ? "bg-amber-950/40 text-amber-400 border-amber-500/30 text-[10px]"
                  : "bg-slate-800 text-slate-400 border-slate-700 text-[10px]"
              }
            >
              {initialProduct.status}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {mode === "edit" && initialProduct?.status === "ACTIVE" && (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-slate-800 bg-slate-900 text-slate-300 text-xs h-8"
            >
              <a href={`/products/${slug}`} target="_blank" rel="noreferrer">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View on Store
              </a>
            </Button>
          )}

          {mode === "edit" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600/80 hover:bg-red-600 text-white text-xs h-8"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(false)}
            disabled={isPending}
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs h-8"
          >
            Save as Draft
          </Button>

          <Button
            size="sm"
            onClick={() => handleSave(true)}
            disabled={isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium h-8 shadow-sm"
          >
            {isPending ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save & Publish"
            )}
          </Button>
        </div>
      </div>

      {/* Feedback Messages */}
      {formError && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
          <XCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Basic Information */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white">
                Basic Information
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Title, handle, and product categorization details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1.5">
                  Title <span className="text-red-400">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Classic Organic Cotton T-Shirt"
                  className="bg-slate-950 border-slate-800 text-white text-xs focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1.5">
                  URL Handle / Slug
                </label>
                <div className="flex items-center rounded-md border border-slate-800 bg-slate-950 px-3 text-slate-400 text-xs">
                  <span className="font-mono text-[11px] select-none">/products/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    placeholder="classic-organic-cotton-t-shirt"
                    className="w-full bg-transparent py-2 pl-1 text-white text-xs font-mono focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Unique within your store. Used in public storefront URLs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Brand / Vendor
                  </label>
                  <Input
                    value={brand || vendor}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      setVendor(e.target.value);
                    }}
                    placeholder="e.g. Acme Studio"
                    className="bg-slate-950 border-slate-800 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Product Type
                  </label>
                  <Input
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    placeholder="e.g. Apparel, Footwear, Electronics"
                    className="bg-slate-950 border-slate-800 text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1.5">
                  Short Description
                </label>
                <Input
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="A one-sentence summary for catalog cards and search engines"
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1.5">
                  Full Description
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed product overview, fabric details, sizing recommendations, and care instructions..."
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Media Gallery */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-white">Media</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Product photos saved directly to secure Supabase Storage. First image is primary.
                  </CardDescription>
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    id="media-uploader"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                  />
                  <label
                    htmlFor="media-uploader"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition shadow-sm"
                  >
                    {isUploadingImage ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" />
                        Upload Image
                      </>
                    )}
                  </label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center bg-slate-950/30">
                  <ImageIcon className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No images uploaded</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Upload high quality JPG, PNG, or WebP images under 5MB.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-lg border border-slate-800 bg-slate-950 overflow-hidden aspect-square"
                    >
                      <img
                        src={img.imageUrl}
                        alt={img.altText || `Image ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      {idx === 0 && (
                        <div className="absolute top-1.5 left-1.5 bg-indigo-600 text-[9px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm">
                          Primary
                        </div>
                      )}

                      {/* Reorder and Delete overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "up")}
                            title="Move earlier"
                            className="p-1 rounded bg-slate-800 text-white hover:bg-slate-700"
                          >
                            <MoveUp className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {idx < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "down")}
                            title="Move later"
                            className="p-1 rounded bg-slate-800 text-white hover:bg-slate-700"
                          >
                            <MoveDown className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          title="Remove image"
                          className="p-1 rounded bg-red-600/80 text-white hover:bg-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Pricing */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white">Pricing</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                All prices are stored as exact integer Paise in Supabase.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Price (₹) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                      ₹
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={basePriceRupees}
                      onChange={(e) => setBasePriceRupees(parseFloat(e.target.value) || 0)}
                      placeholder="999.00"
                      className="pl-7 bg-slate-950 border-slate-800 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Compare-at Price (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                      ₹
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={compareAtPriceRupees ?? ""}
                      onChange={(e) =>
                        setCompareAtPriceRupees(
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      placeholder="1499.00"
                      className="pl-7 bg-slate-950 border-slate-800 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Cost per Item (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                      ₹
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costPriceRupees ?? ""}
                      onChange={(e) =>
                        setCostPriceRupees(
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      placeholder="450.00"
                      className="pl-7 bg-slate-950 border-slate-800 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {profit !== null && (
                <div className="flex items-center gap-4 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400 text-[11px]">
                  <div>
                    Profit:{" "}
                    <span className="font-semibold text-emerald-400 font-mono">
                      ₹{profit.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-3 w-px bg-slate-800" />
                  <div>
                    Margin:{" "}
                    <span className="font-semibold text-emerald-400 font-mono">
                      {marginPercent}%
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">SKU</label>
                  <Input
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. TSH-COT-001"
                    className="bg-slate-950 border-slate-800 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-medium block mb-1.5">
                    Barcode (ISBN, UPC, GTIN)
                  </label>
                  <Input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="e.g. 8901234567890"
                    className="bg-slate-950 border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Variants & Matrix Generator */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-white">Variants</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Multiple options like Size, Color, and Material.
                  </CardDescription>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => {
                      setHasVariants(e.target.checked);
                      if (!e.target.checked) setVariants([]);
                    }}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300 font-medium">
                    This product has options
                  </span>
                </label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {hasVariants ? (
                <>
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-3">
                    <p className="text-xs font-semibold text-slate-200">
                      Option Dimensions (e.g. Size, Color)
                    </p>
                    {optionDimensions.map((dim, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={dim.name}
                          onChange={(e) => {
                            const newDims = [...optionDimensions];
                            newDims[idx].name = e.target.value;
                            setOptionDimensions(newDims);
                          }}
                          placeholder="Option Name (e.g. Size)"
                          className="w-1/3 bg-slate-900 border-slate-800 text-white text-xs"
                        />
                        <Input
                          value={dim.valuesInput}
                          onChange={(e) => {
                            const newDims = [...optionDimensions];
                            newDims[idx].valuesInput = e.target.value;
                            setOptionDimensions(newDims);
                          }}
                          placeholder="Comma-separated values (e.g. S, M, L)"
                          className="flex-1 bg-slate-900 border-slate-800 text-white text-xs"
                        />
                        {optionDimensions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setOptionDimensions((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-slate-500 hover:text-red-400 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}

                    <div className="flex items-center justify-between pt-2">
                      {optionDimensions.length < 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setOptionDimensions((prev) => [
                              ...prev,
                              { name: "Material", valuesInput: "Cotton, Linen" },
                            ])
                          }
                          className="text-indigo-400 hover:text-indigo-300 text-xs h-7"
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Add another option
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={handleGenerateMatrix}
                        className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8"
                      >
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Generate Variant Matrix
                      </Button>
                    </div>
                  </div>

                  {/* Matrix Table */}
                  {variants.length > 0 && (
                    <div className="rounded-lg border border-slate-800 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="border-b border-slate-800 bg-slate-950 text-slate-400 font-medium">
                          <tr>
                            <th className="py-2.5 px-3">Variant</th>
                            <th className="py-2.5 px-3">Price (₹)</th>
                            <th className="py-2.5 px-3">Compare (₹)</th>
                            <th className="py-2.5 px-3">SKU</th>
                            <th className="py-2.5 px-3 w-10 text-right">Active</th>
                            <th className="py-2.5 px-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                          {variants.map((v, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/20">
                              <td className="py-2.5 px-3 font-medium text-slate-200">
                                {v.title}
                              </td>
                              <td className="py-2.5 px-3 w-28">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={v.priceRupees}
                                  onChange={(e) => {
                                    const next = [...variants];
                                    next[idx].priceRupees =
                                      parseFloat(e.target.value) || 0;
                                    setVariants(next);
                                  }}
                                  className="h-7 bg-slate-950 border-slate-800 text-xs font-mono"
                                />
                              </td>
                              <td className="py-2.5 px-3 w-28">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={v.compareAtPriceRupees ?? ""}
                                  onChange={(e) => {
                                    const next = [...variants];
                                    next[idx].compareAtPriceRupees = e.target.value
                                      ? parseFloat(e.target.value)
                                      : undefined;
                                    setVariants(next);
                                  }}
                                  placeholder="—"
                                  className="h-7 bg-slate-950 border-slate-800 text-xs font-mono"
                                />
                              </td>
                              <td className="py-2.5 px-3 w-32">
                                <Input
                                  value={v.sku || ""}
                                  onChange={(e) => {
                                    const next = [...variants];
                                    next[idx].sku = e.target.value;
                                    setVariants(next);
                                  }}
                                  placeholder="SKU"
                                  className="h-7 bg-slate-950 border-slate-800 text-xs font-mono"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="checkbox"
                                  checked={v.isActive}
                                  onChange={(e) => {
                                    const next = [...variants];
                                    next[idx].isActive = e.target.checked;
                                    setVariants(next);
                                  }}
                                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                                />
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVariants((prev) => prev.filter((_, i) => i !== idx))
                                  }
                                  className="text-slate-500 hover:text-red-400"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-500 text-xs italic">
                  Single item product. A default variant will be generated automatically.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Section 5: SEO Preview */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white">
                Search Engine Optimization (SEO)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Optimize how your product appears in Google searches and social media shares.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-medium">Page Title</label>
                  <span className="text-[10px] text-slate-500">
                    {(seoTitle || title).length} / 70 characters
                  </span>
                </div>
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={title || "Product Title"}
                  className="bg-slate-950 border-slate-800 text-white text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-medium">Meta Description</label>
                  <span className="text-[10px] text-slate-500">
                    {(seoDescription || shortDescription || description).length} / 160 characters
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder={
                    shortDescription || description || "Detailed summary for search engines"
                  }
                  className="w-full rounded-md border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Google Search Snippet Preview */}
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Google Search Snippet Preview
                </p>
                <p className="text-xs text-blue-400 hover:underline cursor-pointer font-medium line-clamp-1">
                  {seoTitle || title || "Product Title"}
                </p>
                <p className="text-[11px] text-emerald-500 font-mono">
                  https://yourstore.storefy.in/products/{slug || "product-slug"}
                </p>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  {seoDescription ||
                    shortDescription ||
                    description ||
                    "Enter a description to preview your search engine listing snippet."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Organization & Publishing Sidebar */}
        <div className="space-y-6">
          {/* Publishing Status */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "DRAFT" | "ACTIVE" | "ARCHIVED")
                }
                className="w-full h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="DRAFT">Draft (Hidden from storefront)</option>
                <option value="ACTIVE">Active (Published on storefront)</option>
                <option value="ARCHIVED">Archived (Delisted from catalog)</option>
              </select>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSave(false)}
                  disabled={isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 shadow-sm"
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Category Assignment */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">Category</CardTitle>
                <Link
                  href="/dashboard/products/categories"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  Manage
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">No Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Collections Assignment */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">Collections</CardTitle>
                <Link
                  href="/dashboard/products/collections"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  Manage
                </Link>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Add this product to one or more collections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {collections.length === 0 ? (
                <p className="text-slate-500 text-[11px]">No collections created yet.</p>
              ) : (
                collections.map((col) => {
                  const isChecked = selectedCollections.includes(col.id);
                  return (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/40 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCollection(col.id)}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                      />
                      <span className="text-slate-300">{col.title}</span>
                    </label>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="border-slate-800 bg-slate-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-white">Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="summer, bestseller, new-arrival"
                className="bg-slate-950 border-slate-800 text-white text-xs"
              />
              <p className="text-[10px] text-slate-500">Separate tags with commas.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
