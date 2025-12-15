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

const BIG_PD_KEY =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_BIG_PD_KEY) ||
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_RAPIDAPI_KEY) ||
  "";
const BIG_PD_HOST = "big-product-data.p.rapidapi.com";
const BIG_PD_ENDPOINT = `https://${BIG_PD_HOST}/lookup`;

// Attempts a basic UPC lookup using public endpoints.
export async function lookupProductByUpc(
  upcRaw: string
): Promise<ProductLookupResult | null> {
  const upc = (upcRaw || "").replace(/\D/g, "");
  if (!upc) return null;

  // Preferred: Big Product Data on RapidAPI.
  if (BIG_PD_KEY) {
    try {
      const resp = await fetch(
        `${BIG_PD_ENDPOINT}?barcode=${encodeURIComponent(upc)}`,
        {
          headers: {
            "X-RapidAPI-Key": BIG_PD_KEY,
            "X-RapidAPI-Host": BIG_PD_HOST,
          },
        }
      );
      if (resp.ok) {
        const json: any = await resp.json();
        // API sometimes returns { products: [...] } or { product: {...} }
        const product =
          json?.products?.[0] ?? json?.product ?? json?.data ?? null;
        if (product) {
          return {
            upc,
            title:
              product.title ??
              product.name ??
              product.product_name ??
              product.category,
            brand: product.brand ?? product.manufacturer ?? product.company,
            model:
              product.model ??
              product.mpn ??
              product.asin ??
              product.part_number ??
              "",
            description: product.description ?? "",
            imageUrl:
              Array.isArray(product.images) && product.images.length > 0
                ? product.images[0]
                : product.image ?? "",
            category: product.category ?? product.category_name ?? "",
          };
        }
      } else {
        console.warn("RapidAPI lookup response", resp.status);
      }
    } catch (err) {
      console.error("RapidAPI lookup failed", err);
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
