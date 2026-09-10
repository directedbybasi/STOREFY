import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveStorefrontTenant } from "@/modules/storefront/store-resolver";
import { generateProductMetadata } from "@/modules/storefront/seo";
import { db } from "@/database/client";
import { products, productVariants, productImages, categories } from "@/database/schema";
import { eq, and, asc } from "drizzle-orm";
import { ProductDetailView } from "@/components/storefront/product-detail-view";

interface ProductPageProps {
  params: Promise<{
    domain: string;
    handle: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { domain, handle } = await params;
  return generateProductMetadata({ domain, handle });
}

export default async function StorefrontProductDetailPage({
  params,
}: ProductPageProps) {
  const { domain, handle } = await params;
  const resolution = await resolveStorefrontTenant(domain);

  if (resolution.status !== "ACTIVE") {
    notFound();
  }

  const { store } = resolution;

  // Query product strictly scoped to the active tenant store and handle
  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      description: products.description,
      shortDescription: products.shortDescription,
      brand: products.brand,
      vendor: products.vendor,
      basePrice: products.basePrice,
      compareAtPrice: products.compareAtPrice,
      sku: products.sku,
      barcode: products.barcode,
      categoryId: products.categoryId,
    })
    .from(products)
    .where(
      and(
        eq(products.storeId, store.id),
        eq(products.slug, handle),
        eq(products.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!product) {
    notFound();
  }

  // Fetch variants for this product
  const variants = await db
    .select({
      id: productVariants.id,
      title: productVariants.title,
      sku: productVariants.sku,
      barcode: productVariants.barcode,
      price: productVariants.price,
      compareAtPrice: productVariants.compareAtPrice,
      option1: productVariants.option1,
      option2: productVariants.option2,
      option3: productVariants.option3,
      imageUrl: productVariants.imageUrl,
      isActive: productVariants.isActive,
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.productId, product.id),
        eq(productVariants.storeId, store.id),
        eq(productVariants.isActive, true)
      )
    )
    .orderBy(asc(productVariants.sortOrder), asc(productVariants.createdAt));

  // Fetch images for this product
  const images = await db
    .select({
      id: productImages.id,
      imageUrl: productImages.imageUrl,
      altText: productImages.altText,
      sortOrder: productImages.sortOrder,
    })
    .from(productImages)
    .where(and(eq(productImages.productId, product.id), eq(productImages.storeId, store.id)))
    .orderBy(asc(productImages.sortOrder), asc(productImages.createdAt));

  // Fetch category name if assigned
  let categoryName: string | null = null;
  if (product.categoryId) {
    const [cat] = await db
      .select({ name: categories.name })
      .from(categories)
      .where(and(eq(categories.id, product.categoryId), eq(categories.storeId, store.id)))
      .limit(1);
    if (cat) categoryName = cat.name;
  }

  return (
    <ProductDetailView
      product={product}
      variants={variants}
      images={images}
      categoryName={categoryName}
      storeName={store.name}
    />
  );
}
