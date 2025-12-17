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

// Go-UPC API key is provided via Vite env.
// Support both names for backward compatibility.
const GO_UPC_KEY =
  (typeof import.meta !== "undefined" &&
    ((import.meta as any).env?.VITE_GOUPC_API_KEY ||
      (import.meta as any).env?.VITE_GO_UPC_KEY)) ||
  "";

// During local dev, route through Vite proxy to avoid CORS.
// In production builds, this falls back to direct Go-UPC host.
const GO_UPC_ENDPOINT =
  typeof import.meta !== "undefined" && (import.meta as any).env?.DEV
    ? "/api/goupc/api/v1/code"
    : "https://go-upc.com/api/v1/code";

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

// Attempts a basic UPC lookup using public endpoints.
export async function lookupProductByUpc(
  upcRaw: string
): Promise<ProductLookupResult | null> {
  const upc = (upcRaw || "").replace(/\D/g, "");
  if (!upc) return null;

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

  // First try upcitemdb's trial endpoint (public, rate limited).
  try {
    const resp = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(
        upc
      )}`
    );
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
