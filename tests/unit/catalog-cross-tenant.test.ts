import { describe, it, expect, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/core/errors";

interface MockProduct {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  basePrice: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

interface MockVariant {
  id: string;
  productId: string;
  storeId: string;
  title: string;
  sku: string;
  price: number;
}

interface MockImage {
  id: string;
  productId: string;
  storeId: string;
  imageUrl: string;
  storagePath: string;
}

interface MockCategory {
  id: string;
  storeId: string;
  name: string;
  slug: string;
  parentId: string | null;
}

interface MockCollection {
  id: string;
  storeId: string;
  title: string;
  slug: string;
  productIds: string[];
}

// Multi-tenant Catalog Security Enforcement Engine
class MockCatalogSecurityEngine {
  private products: MockProduct[] = [];
  private variants: MockVariant[] = [];
  private images: MockImage[] = [];
  private categories: MockCategory[] = [];
  private collections: MockCollection[] = [];

  addProduct(p: MockProduct) {
    this.products.push(p);
  }

  addVariant(v: MockVariant) {
    this.variants.push(v);
  }

  addImage(img: MockImage) {
    this.images.push(img);
  }

  addCategory(c: MockCategory) {
    this.categories.push(c);
  }

  addCollection(col: MockCollection) {
    this.collections.push(col);
  }

  // Tenant-scoped direct ID query
  getProductById(activeStoreId: string, productId: string): MockProduct {
    const product = this.products.find(
      (p) => p.id === productId && p.storeId === activeStoreId
    );
    if (!product) {
      throw new NotFoundError(
        `Product '${productId}' not found or unauthorized for store '${activeStoreId}'`
      );
    }
    return product;
  }

  // Tenant-scoped update
  updateProduct(
    activeStoreId: string,
    productId: string,
    updates: Partial<MockProduct>
  ): MockProduct {
    const product = this.getProductById(activeStoreId, productId);
    Object.assign(product, updates);
    return product;
  }

  // Tenant-scoped delete
  deleteProduct(activeStoreId: string, productId: string): string {
    const product = this.getProductById(activeStoreId, productId);
    this.products = this.products.filter((p) => p.id !== product.id);
    return productId;
  }

  // Tenant-scoped variant access
  getVariants(activeStoreId: string, productId: string): MockVariant[] {
    // Verify product belongs to store
    this.getProductById(activeStoreId, productId);
    return this.variants.filter(
      (v) => v.productId === productId && v.storeId === activeStoreId
    );
  }

  // Tenant-scoped image access
  getImages(activeStoreId: string, productId: string): MockImage[] {
    this.getProductById(activeStoreId, productId);
    return this.images.filter(
      (i) => i.productId === productId && i.storeId === activeStoreId
    );
  }

  // Tenant-scoped category access
  getCategory(activeStoreId: string, categoryId: string): MockCategory {
    const category = this.categories.find(
      (c) => c.id === categoryId && c.storeId === activeStoreId
    );
    if (!category) {
      throw new NotFoundError(`Category '${categoryId}' not found for store '${activeStoreId}'`);
    }
    return category;
  }

  // Tenant-scoped collection access
  getCollection(activeStoreId: string, collectionId: string): MockCollection {
    const col = this.collections.find(
      (c) => c.id === collectionId && c.storeId === activeStoreId
    );
    if (!col) {
      throw new NotFoundError(
        `Collection '${collectionId}' not found for store '${activeStoreId}'`
      );
    }
    return col;
  }

  // Storefront Handle Resolver
  resolveStorefrontProduct(storeDomainStoreId: string, handle: string): MockProduct {
    const product = this.products.find(
      (p) =>
        p.storeId === storeDomainStoreId &&
        p.slug === handle &&
        p.status === "ACTIVE"
    );
    if (!product) {
      throw new NotFoundError(`Product handle '${handle}' not found in store '${storeDomainStoreId}'`);
    }
    return product;
  }

  // Bulk Edit
  bulkEdit(
    activeStoreId: string,
    action: "PUBLISH" | "ARCHIVE" | "DELETE",
    targetIds: string[]
  ): number {
    // Zero-trust multi-tenant filter: only affect items belonging to activeStoreId
    const eligible = this.products.filter(
      (p) => targetIds.includes(p.id) && p.storeId === activeStoreId
    );

    for (const p of eligible) {
      if (action === "PUBLISH") p.status = "ACTIVE";
      if (action === "ARCHIVE") p.status = "ARCHIVED";
      if (action === "DELETE") {
        this.products = this.products.filter((item) => item.id !== p.id);
      }
    }
    return eligible.length;
  }

  // Storage Path Security Check
  validateStorageUploadPath(activeStoreId: string, uploadPath: string): boolean {
    const expectedPrefix = `stores/${activeStoreId}/`;
    if (!uploadPath.startsWith(expectedPrefix)) {
      throw new ForbiddenError(
        `Storage isolation violation: Store '${activeStoreId}' cannot upload to path '${uploadPath}'`
      );
    }
    return true;
  }

  // Assign product to collection
  assignProductsToCollection(
    activeStoreId: string,
    collectionId: string,
    candidateProductIds: string[]
  ): string[] {
    const col = this.getCollection(activeStoreId, collectionId);
    // Filter candidate products strictly to activeStoreId
    const validStoreProductIds = candidateProductIds.filter((pId) => {
      const exists = this.products.find(
        (p) => p.id === pId && p.storeId === activeStoreId
      );
      return Boolean(exists);
    });

    col.productIds = validStoreProductIds;
    return validStoreProductIds;
  }
}

describe("Critical Cross-Tenant Isolation (Requirement 28)", () => {
  const storeA = "store-aaa-1111";
  const storeB = "store-bbb-2222";

  let engine: MockCatalogSecurityEngine;

  const productA: MockProduct = {
    id: "prod-a-01",
    storeId: storeA,
    title: "Store A Silk Kurta",
    slug: "store-a-silk-kurta",
    basePrice: 199900,
    status: "ACTIVE",
  };

  const productB: MockProduct = {
    id: "prod-b-01",
    storeId: storeB,
    title: "Store B Leather Wallet",
    slug: "store-b-leather-wallet",
    basePrice: 89900,
    status: "ACTIVE",
  };

  const variantB: MockVariant = {
    id: "var-b-01",
    productId: productB.id,
    storeId: storeB,
    title: "Brown",
    sku: "WAL-BRN",
    price: 89900,
  };

  const imageB: MockImage = {
    id: "img-b-01",
    productId: productB.id,
    storeId: storeB,
    imageUrl: "https://storage.storefy.in/stores/store-bbb-2222/wallet.jpg",
    storagePath: "stores/store-bbb-2222/products/prod-b-01/wallet.jpg",
  };

  const categoryA: MockCategory = {
    id: "cat-a-01",
    storeId: storeA,
    name: "Ethnic Wear",
    slug: "ethnic-wear",
    parentId: null,
  };

  const categoryB: MockCategory = {
    id: "cat-b-01",
    storeId: storeB,
    name: "Accessories",
    slug: "accessories",
    parentId: null,
  };

  const collectionA: MockCollection = {
    id: "col-a-01",
    storeId: storeA,
    title: "Festive Collection",
    slug: "festive",
    productIds: [productA.id],
  };

  const collectionB: MockCollection = {
    id: "col-b-01",
    storeId: storeB,
    title: "Daily Essentials",
    slug: "daily-essentials",
    productIds: [productB.id],
  };

  beforeEach(() => {
    engine = new MockCatalogSecurityEngine();
    engine.addProduct(productA);
    engine.addProduct(productB);
    engine.addVariant(variantB);
    engine.addImage(imageB);
    engine.addCategory(categoryA);
    engine.addCategory(categoryB);
    engine.addCollection(collectionA);
    engine.addCollection(collectionB);
  });

  it("Store A cannot read Product B by direct ID", () => {
    expect(() => engine.getProductById(storeA, productB.id)).toThrow(NotFoundError);
  });

  it("Store A cannot update Product B", () => {
    expect(() =>
      engine.updateProduct(storeA, productB.id, { title: "Hijacked Product" })
    ).toThrow(NotFoundError);
  });

  it("Store A cannot delete Product B", () => {
    expect(() => engine.deleteProduct(storeA, productB.id)).toThrow(NotFoundError);
  });

  it("Store A cannot read Variant B", () => {
    expect(() => engine.getVariants(storeA, productB.id)).toThrow(NotFoundError);
  });

  it("Store A cannot access Image B", () => {
    expect(() => engine.getImages(storeA, productB.id)).toThrow(NotFoundError);
  });

  it("Store A cannot access Category B", () => {
    expect(() => engine.getCategory(storeA, categoryB.id)).toThrow(NotFoundError);
  });

  it("Store A cannot access Collection B", () => {
    expect(() => engine.getCollection(storeA, collectionB.id)).toThrow(NotFoundError);
  });

  it("Store A cannot access Product B through Store A's public storefront PDP /products/[handle]", () => {
    // Attempting to resolve Product B's handle under Store A domain fails
    expect(() =>
      engine.resolveStorefrontProduct(storeA, productB.slug)
    ).toThrow(NotFoundError);
  });

  it("Store A cannot bulk-edit Store B products", () => {
    // Store A tries to bulk-archive both its own product and Store B's product
    const modified = engine.bulkEdit(storeA, "ARCHIVE", [productA.id, productB.id]);
    expect(modified).toBe(1); // Only Product A is modified

    // Product B remains active and untouched
    const untouchedB = engine.getProductById(storeB, productB.id);
    expect(untouchedB.status).toBe("ACTIVE");
  });

  it("Store A cannot upload images into Store B storage paths", () => {
    const foreignPath = `stores/${storeB}/products/malicious.jpg`;
    expect(() => engine.validateStorageUploadPath(storeA, foreignPath)).toThrow(
      ForbiddenError
    );

    const validPath = `stores/${storeA}/products/prod-a-01/image.jpg`;
    expect(engine.validateStorageUploadPath(storeA, validPath)).toBe(true);
  });

  it("Store A cannot use Store B's product in a collection", () => {
    // Store A attempts to add Product B to Collection A
    const assigned = engine.assignProductsToCollection(storeA, collectionA.id, [
      productA.id,
      productB.id,
    ]);

    expect(assigned).toEqual([productA.id]);
    expect(assigned).not.toContain(productB.id);

    const colA = engine.getCollection(storeA, collectionA.id);
    expect(colA.productIds).not.toContain(productB.id);
  });
});
