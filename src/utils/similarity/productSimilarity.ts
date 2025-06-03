import { BaseProductDB, BaseProductScrap } from "../../interfaces";
import { getFastImageSimilarity, getImageSimilarity } from "./imageSimilarity";
import {
  getStringSimilarity,
  getStringSimilarityDiceCoefficient,
  getStringSimilarityJaroWinkler,
} from "./stringSimilarity";

// Simple fast image hash similarity using base64 string length difference as a placeholder.
// Replace this with a real image hash (pHash/dHash/aHash) for better results.

export async function getBestMatch(
  baseProduct: BaseProductDB,
  products: BaseProductScrap[],
  options?: {
    nameWeight?: number;
    imageWeight?: number;
    skuWeight?: number;
    minScore?: number;
    log?: boolean;
    fastImageTopN?: number; // Optionally override top-N for expensive check
  }
): Promise<BaseProductScrap | null> {
  const NAME_WEIGHT = options?.nameWeight ?? 0.5;
  const IMAGE_WEIGHT = options?.imageWeight ?? 0.2;
  const SKU_WEIGHT = options?.skuWeight ?? 0.3;
  const MIN_SCORE = options?.minScore ?? 0.8;
  const LOG = options?.log ?? true;

  let bestMatch: BaseProductScrap | null = null;
  let bestScore = -1;

  const normalizedBrand = baseProduct.Brand.name?.toUpperCase().trim();

  // Filter by brand first for efficiency
  const filtered = products.filter(
    (p) =>
      p.brand &&
      normalizedBrand &&
      baseProduct.Brand.name &&
      p.brand.toUpperCase().trim() === normalizedBrand
  );

  if (LOG) console.log("Searching for: ", baseProduct.sku);

  // 1. Precompute name and sku similarities. Only keep those passing name threshold.
  const candidates = [] as Array<{
    product: BaseProductScrap;
    nameSimilarity: number;
    skuSimilarity: number;
  }>;

  for (const product of filtered) {
    if (
      product.sku &&
      baseProduct.sku &&
      product.sku.toUpperCase() === baseProduct.sku.toUpperCase()
    ) {
      if (LOG) console.log("Exact SKU match found:", product.sku);
      return product;
    }

    const nameSimilarity = getStringSimilarityJaroWinkler(
      normalizeString(baseProduct.name),
      normalizeString(product.name)
    );
    // if (LOG) console.log(`[${product.sku}] Name similarity: ${nameSimilarity}`);
    if (nameSimilarity < 0.6) continue;

    const skuSimilarity = getStringSimilarityDiceCoefficient(
      normalizeString(baseProduct.sku),
      normalizeString(product.sku)
    );

    // Fast image similarity (hash-based, cheap)
    // const fastImageSim = await getFastImageSimilarity(
    //   baseProduct.image || "",
    //   product.image || ""
    // );
    // if (LOG)
    //   console.log(`[${product.sku}] Fast image similarity: ${fastImageSim}`);

    candidates.push({ product, nameSimilarity, skuSimilarity });
  }

  // 2. Sort by fast image similarity and pick top N
  const TOP_N = options?.fastImageTopN ?? 5;
  const topCandidates = candidates
    .sort(
      (a, b) =>
        b.nameSimilarity +
        b.skuSimilarity -
        (a.nameSimilarity + a.skuSimilarity)
    )
    .slice(0, TOP_N);

  // 3. Compute expensive image similarities in parallel for top N
  const imageSimilarities = await Promise.all(
    topCandidates.map(({ product }) =>
      getImageSimilarity(baseProduct.image || "", product.image || "")
    )
  );

  // 4. Score and pick best from top N
  for (let i = 0; i < topCandidates.length; i++) {
    const { product, nameSimilarity, skuSimilarity } = topCandidates[i];
    const imageSimilarity = imageSimilarities[i];

    const MIN_IMAGE_SIM = 0.3;
    const MIN_SKU_SIM = 0.3;
    const adjustedImageSim = Math.max(imageSimilarity, MIN_IMAGE_SIM);
    const adjustedSkuSim = Math.max(skuSimilarity, MIN_SKU_SIM);

    const score =
      NAME_WEIGHT * nameSimilarity +
      IMAGE_WEIGHT * adjustedImageSim +
      SKU_WEIGHT * adjustedSkuSim;

    if (LOG) {
      console.log(
        `[${product.sku}] NameSim: ${nameSimilarity.toFixed(
          2
        )}, ImgSim: ${imageSimilarity.toFixed(
          2
        )}, SkuSim: ${skuSimilarity.toFixed(2)}, Score: ${score.toFixed(2)}`
      );
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = product;
    }
  }

  if (LOG) {
    if (bestMatch && bestScore >= MIN_SCORE) {
      console.log(
        `Best match found: ${bestMatch.sku} with score ${bestScore.toFixed(2)}`
      );
    } else if (bestMatch) {
      console.log(
        `Closest match (below threshold): ${
          bestMatch.sku
        } with score ${bestScore.toFixed(2)}`
      );
    } else {
      console.log("No match found.");
    }
  }

  // Only return if above threshold, otherwise null
  return bestScore >= MIN_SCORE ? bestMatch : null;
}

function normalizeString(str: string): string {
  return str
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ");
}
