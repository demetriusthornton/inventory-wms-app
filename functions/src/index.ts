import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Product lookup result interface
 */
interface ProductLookupResult {
  upc: string;
  title?: string;
  brand?: string;
  model?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
}

/**
 * Securely lookup UPC product information using server-side API keys.
 *
 * This function keeps API keys secure by storing them in Cloud Function
 * environment variables instead of exposing them in client-side code.
 *
 * Three-tier fallback approach:
 * 1. Go-UPC API (preferred, requires API key)
 * 2. UPCItemDB (trial or authenticated)
 * 3. OpenFoodFacts (free, food products only)
 */
export const lookupUPC = functions.https.onCall(async (data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Must be authenticated to lookup UPC codes"
    );
  }

  // Verify email is verified
  if (!context.auth.token.email_verified) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Email must be verified to use this service"
    );
  }

  // Rate limiting: Check request count (optional, implement with Firestore)
  // TODO: Implement rate limiting per user

  const { upc: upcRaw } = data;

  if (!upcRaw || typeof upcRaw !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "UPC code is required and must be a string"
    );
  }

  // Sanitize UPC (remove non-digits)
  const upc = upcRaw.replace(/\D/g, "");
  if (!upc) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid UPC code format"
    );
  }

  // Validate UPC length (12-14 digits)
  if (upc.length < 12 || upc.length > 14) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "UPC code must be 12-14 digits"
    );
  }

  // Get API keys from environment (set via firebase functions:config:set)
  const goUpcKey = process.env.GO_UPC_API_KEY;
  const upcItemDbKey = process.env.UPCITEMDB_API_KEY;

  // Try Go-UPC first (if API key configured)
  if (goUpcKey) {
    try {
      const response = await fetch(
        `https://go-upc.com/api/v1/code/${encodeURIComponent(upc)}?key=${encodeURIComponent(goUpcKey)}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (response.ok) {
        const json: any = await response.json();
        const product = json?.product;
        if (product) {
          const result: ProductLookupResult = {
            upc,
            title: product.title ?? product.name ?? product.product_name,
            brand: product.brand ?? product.manufacturer ?? product.company,
            model: product.model ?? product.mpn ?? product.asin ?? product.part_number ?? "",
            description: product.description ?? product.overview ?? product.long_description,
            imageUrl: Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]
              : product.image ?? "",
            category: product.category ?? product.category_name ?? "",
          };

          functions.logger.info("Go-UPC lookup successful", { upc, uid: context.auth.uid });
          return result;
        }
      } else if (response.status === 401 || response.status === 403) {
        functions.logger.warn("Go-UPC unauthorized - check API key");
      }
    } catch (error) {
      functions.logger.error("Go-UPC lookup failed", { error, upc });
    }
  }

  // Try UPCItemDB (trial or authenticated)
  try {
    const upcDbUrl = upcItemDbKey
      ? `https://api.upcitemdb.com/prod/v1/lookup?upc=${encodeURIComponent(upc)}`
      : `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`;

    const headers: HeadersInit = {
      Accept: "application/json",
    };
    if (upcItemDbKey) {
      headers["user_key"] = upcItemDbKey;
    }

    const response = await fetch(upcDbUrl, {
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const json: any = await response.json();
      const item = json?.items?.[0];
      if (item) {
        const result: ProductLookupResult = {
          upc,
          title: item.title ?? item.brand,
          brand: item.brand ?? item.manufacturer,
          model: item.model ?? item.asin ?? "",
          description: item.description ?? item.title ?? "",
          imageUrl: item.images?.[0] ?? "",
          category: item.category ?? item.categoryName ?? "",
        };

        functions.logger.info("UPCItemDB lookup successful", { upc, uid: context.auth.uid });
        return result;
      }
    } else if (response.status === 401 || response.status === 403) {
      functions.logger.warn("UPCItemDB unauthorized - check API key");
    }
  } catch (error) {
    functions.logger.error("UPCItemDB lookup failed", { error, upc });
  }

  // Try OpenFoodFacts as final fallback (food products only)
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(upc)}.json`,
      {
        signal: AbortSignal.timeout(10000),
      }
    );

    if (response.ok) {
      const json: any = await response.json();
      const product = json?.product;
      if (product) {
        const result: ProductLookupResult = {
          upc,
          title: product.product_name_en ?? product.product_name ?? "",
          brand: product.brands ?? product.brand_owner ?? "",
          model: product.code ?? "",
          description: product.generic_name_en ?? product.generic_name ?? product.ingredients_text ?? "",
          imageUrl: product.image_url ?? "",
          category: product.categories ?? "",
        };

        functions.logger.info("OpenFoodFacts lookup successful", { upc, uid: context.auth.uid });
        return result;
      }
    }
  } catch (error) {
    functions.logger.error("OpenFoodFacts lookup failed", { error, upc });
  }

  // No results found from any API
  functions.logger.info("UPC lookup failed - no results", { upc, uid: context.auth.uid });
  throw new functions.https.HttpsError(
    "not-found",
    "No product found for that UPC code"
  );
});

/**
 * Health check endpoint for monitoring
 */
export const healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});
