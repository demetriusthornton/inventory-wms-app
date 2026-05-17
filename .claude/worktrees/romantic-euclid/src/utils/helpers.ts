export function jsonSafeParse<T = any>(value: any): T | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

/**
 * Validates and sanitizes an image URL to prevent XSS attacks.
 * Only allows http, https, and data URLs with image MIME types.
 * Returns the sanitized URL or an empty string if invalid.
 */
export function sanitizeImageUrl(url: string | undefined | null): string {
  if (!url || typeof url !== "string") return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  try {
    // Allow data URLs for images
    if (trimmed.startsWith("data:image/")) {
      // Validate it's a proper data URL for images
      const mimeMatch = trimmed.match(/^data:image\/(png|jpg|jpeg|gif|webp|svg\+xml);base64,/);
      return mimeMatch ? trimmed : "";
    }

    // Parse and validate regular URLs
    const parsed = new URL(trimmed);

    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }

    // Return the sanitized URL
    return parsed.href;
  } catch {
    // Invalid URL
    return "";
  }
}

// ⚠️ SECURITY WARNING: API keys stored in Vite env variables are embedded in the
// client-side JavaScript bundle and are visible to anyone who inspects the code.
//
// RECOMMENDATION FOR PRODUCTION:
// - Move API calls to backend Cloud Functions
// - Store API keys in Cloud Function environment variables
// - Implement rate limiting on backend
// - Use Firebase App Check to prevent API abuse
//
// For development/testing only, API keys can be stored in .env.local (never commit!)

// Go-UPC API key is provided via Vite env.
// Support both names for backward compatibility.
const GO_UPC_KEY =
  (typeof import.meta !== "undefined" &&
    ((import.meta as any).env?.VITE_GOUPC_API_KEY ||
      (import.meta as any).env?.VITE_GO_UPC_KEY)) ||
  "";

// UPCItemDB API key
const UPCITEMDB_KEY =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_UPCITEMDB_KEY) ||
  "";

// During local dev, route through Vite proxy to avoid CORS.
// In production builds, this falls back to direct Go-UPC host.
const GO_UPC_ENDPOINT =
  typeof import.meta !== "undefined" && (import.meta as any).env?.DEV
    ? "/api/goupc/api/v1/code"
    : "https://go-upc.com/api/v1/code";

// UPCItemDB endpoints (proxy in dev, direct in production)
const UPCITEMDB_TRIAL_ENDPOINT =
  typeof import.meta !== "undefined" && (import.meta as any).env?.DEV
    ? "/api/upcitemdb/prod/trial/lookup"
    : "https://api.upcitemdb.com/prod/trial/lookup";

const UPCITEMDB_AUTH_ENDPOINT =
  typeof import.meta !== "undefined" && (import.meta as any).env?.DEV
    ? "/api/upcitemdb/prod/v1/lookup"
    : "https://api.upcitemdb.com/prod/v1/lookup";

export function buildBasePath(appId: string) {
  // Shared data across users; even segments so `${basePath}/collection` is valid
  return `artifacts/${appId}/shared/global`;
}

export function parseCsvSimple(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  return lines.map((line) => line.split(",").map((cell) => cell.trim()));
}

export interface ProductLookupResult {
  upc: string;
  title?: string;
  brand?: string;
  model?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
}

// Feature flag: Use Cloud Functions for UPC lookup in production
// Set to true to use secure Cloud Functions (recommended for production)
// Set to false to use direct API calls (development only)
const USE_CLOUD_FUNCTIONS =
  typeof import.meta !== "undefined" &&
  (import.meta as any).env?.VITE_USE_CLOUD_FUNCTIONS === "true";

/**
 * Lookup UPC product information.
 *
 * When USE_CLOUD_FUNCTIONS is true, this calls a secure Cloud Function.
 * Otherwise, it makes direct API calls (less secure, for development only).
 *
 * @param upcRaw - The UPC code to lookup
 * @param firebaseApp - Optional Firebase app instance (required for Cloud Functions)
 * @returns Product information or null if not found
 */
export async function lookupProductByUpc(
  upcRaw: string,
  firebaseApp?: any // Firebase app instance for Cloud Functions
): Promise<ProductLookupResult | null> {
  const upc = (upcRaw || "").replace(/\D/g, "");
  if (!upc) return null;

  // Use Cloud Functions if enabled (secure, recommended for production)
  if (USE_CLOUD_FUNCTIONS && firebaseApp) {
    try {
      // Dynamically import Firebase Functions to avoid bundle bloat
      const { getFunctions, httpsCallable } = await import("firebase/functions");

      const functions = getFunctions(firebaseApp);
      const lookupUPCFunction = httpsCallable<{ upc: string }, ProductLookupResult>(
        functions,
        "lookupUPC"
      );

      const result = await lookupUPCFunction({ upc });
      return result.data;
    } catch (error: any) {
      console.error("Cloud Function lookup failed:", error);
      // If error code is 'not-found', return null
      if (error?.code === "functions/not-found") {
        return null;
      }
      // For other errors, throw to let caller handle
      throw error;
    }
  }

  // Fall back to direct API calls (development only - exposes API keys!)

  // Preferred: Go-UPC (requires API key via VITE_GO_UPC_KEY).
  if (GO_UPC_KEY) {
    try {
      const resp = await fetch(
        `${GO_UPC_ENDPOINT}/${encodeURIComponent(upc)}?key=${encodeURIComponent(
          GO_UPC_KEY
        )}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );
      if (resp.ok) {
        const json: any = await resp.json();
        // Go-UPC responds with { product: {...} }
        const product = json?.product ?? null;
        if (product) {
          return {
            upc,
            title: product.title ?? product.name ?? product.product_name,
            brand: product.brand ?? product.manufacturer ?? product.company,
            model:
              product.model ??
              product.mpn ??
              product.asin ??
              product.part_number ??
              "",
            description:
              product.description ??
              product.overview ??
              product.long_description,
            imageUrl:
              Array.isArray(product.images) && product.images.length > 0
                ? product.images[0]
                : product.image ?? "",
            category: product.category ?? product.category_name ?? "",
          };
        }
      } else if (resp.status === 401 || resp.status === 403) {
        console.warn("Go-UPC unauthorized; check VITE_GO_UPC_KEY");
      }
    } catch (err) {
      console.error("Go-UPC lookup failed", err);
    }
  }

  // Try UPCItemDB (uses trial endpoint if no API key, authenticated if key provided).
  try {
    const endpoint = UPCITEMDB_KEY ? UPCITEMDB_AUTH_ENDPOINT : UPCITEMDB_TRIAL_ENDPOINT;
    const upcDbUrl = `${endpoint}?upc=${encodeURIComponent(upc)}`;

    const headers: HeadersInit = {
      Accept: "application/json",
    };
    if (UPCITEMDB_KEY) {
      headers["user_key"] = UPCITEMDB_KEY;
    }

    const resp = await fetch(upcDbUrl, { headers });
    if (resp.ok) {
      const json: any = await resp.json();
      const item = json?.items?.[0];
      if (item) {
        return {
          upc,
          title: item.title ?? item.brand,
          brand: item.brand ?? item.manufacturer,
          model: item.model ?? item.asin ?? "",
          description: item.description ?? item.title ?? "",
          imageUrl: item.images?.[0] ?? "",
          category: item.category ?? item.categoryName ?? "",
        };
      }
    } else if (resp.status === 401 || resp.status === 403) {
      console.warn("UPCItemDB unauthorized; check VITE_UPCITEMDB_KEY");
    }
  } catch (err) {
    console.error("UPCItemDB lookup failed", err);
  }

  // Fallback to OpenFoodFacts; not all UPCs will exist here.
  try {
    const resp = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
        upc
      )}.json`
    );
    if (resp.ok) {
      const json: any = await resp.json();
      const product = json?.product;
      if (product) {
        return {
          upc,
          title: product.product_name_en ?? product.product_name ?? "",
          brand: product.brands ?? product.brand_owner ?? "",
          model: product.code ?? "",
          description:
            product.generic_name_en ??
            product.generic_name ??
            product.ingredients_text ??
            "",
          imageUrl: product.image_url ?? "",
          category: product.categories ?? "",
        };
      }
    }
  } catch (err) {
    console.error("OpenFoodFacts lookup failed", err);
  }

  return null;
}
