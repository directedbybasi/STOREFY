export interface BindingContext {
  store?: {
    name?: string;
    subdomain?: string;
    customDomain?: string | null;
    currency?: string;
    logoUrl?: string | null;
    description?: string;
  };
  product?: {
    id?: string;
    title?: string;
    description?: string;
    price?: number | string;
    comparePrice?: number | string | null;
    compareAtPrice?: number | string | null;
    sku?: string;
    image?: string;
    primaryImageUrl?: string;
    handle?: string;
  };
  collection?: {
    id?: string;
    title?: string;
    description?: string;
    productsCount?: number;
    products?: string;
  };
}

/**
 * Approved whitelist of dynamic data paths.
 * Prevents arbitrary property access, prototypes, or code injection.
 */
const APPROVED_BINDING_PATHS: Record<string, string[]> = {
  store: ["name", "subdomain", "customDomain", "currency", "logoUrl", "description"],
  product: [
    "title",
    "description",
    "price",
    "comparePrice",
    "compareAtPrice",
    "sku",
    "image",
    "primaryImageUrl",
    "handle",
  ],
  collection: ["title", "description", "productsCount", "products"],
};

/**
 * Resolves a dynamic token path safely against the context.
 * Strictly checks whitelist; never executes eval or arbitrary JS expressions.
 */
export function resolveBindingValue(
  path: string,
  context: BindingContext
): string | undefined {
  const parts = path.trim().split(".");
  if (parts.length !== 2) return undefined;

  const [scope, key] = parts;
  if (!Object.prototype.hasOwnProperty.call(APPROVED_BINDING_PATHS, scope)) {
    return undefined;
  }

  const allowedKeys = APPROVED_BINDING_PATHS[scope];
  if (!Array.isArray(allowedKeys) || !allowedKeys.includes(key)) {
    return undefined;
  }

  if (!context || typeof context !== "object" || !Object.prototype.hasOwnProperty.call(context, scope)) {
    return undefined;
  }

  const scopeObject = (context as unknown as Record<string, Record<string, unknown>>)[scope];
  if (!scopeObject || typeof scopeObject !== "object") return undefined;

  if (!Object.prototype.hasOwnProperty.call(scopeObject, key)) {
    return undefined;
  }

  const value = scopeObject[key];
  if (value === undefined || value === null) return undefined;

  return String(value);
}

/**
 * Interpolates dynamic tokens in a text template string.
 * Replaces {{ scope.key }} with safe evaluated values.
 * If a token is not found or invalid, it falls back to an empty string or preserves the fallback.
 */
export function interpolateBindings(
  templateString: string | undefined | null,
  context: BindingContext
): string {
  if (!templateString || typeof templateString !== "string") return "";

  // Matches {{ scope.property }} safely
  const tokenRegex = /\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+)\s*\}\}/g;

  return templateString.replace(tokenRegex, (match, path) => {
    const resolved = resolveBindingValue(path, context);
    return resolved !== undefined ? resolved : match;
  });
}
