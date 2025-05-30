import { BaseProductDB, BaseProductScrap } from "../../interfaces";
import { getImageSimilarity } from "./imageSimilarity";
import { getStringSimilarity } from "./stringSimilarity";

export async function getBestMatch(
  baseProduct: BaseProductDB,
  products: BaseProductScrap[],
  options?: {
    nameWeight?: number;
    imageWeight?: number;
    minScore?: number;
    log?: boolean;
  }
): Promise<BaseProductScrap | null> {
  const NAME_WEIGHT = options?.nameWeight ?? 0.7;
  const IMAGE_WEIGHT = options?.imageWeight ?? 0.3;
  const MIN_SCORE = options?.minScore ?? 0.8 * (NAME_WEIGHT + IMAGE_WEIGHT);
  const LOG = options?.log ?? true;

  let bestMatch: BaseProductScrap | null = null;
  let bestScore = -1;

  // Filter by brand first for efficiency
  const filtered = products.filter(
    (p) =>
      p.brand &&
      baseProduct.Brand.name &&
      p.brand.toUpperCase() === baseProduct.Brand.name.toUpperCase()
  );

  if (LOG) console.log("Searching for: ", baseProduct.sku);
  for (const product of filtered) {
    if (
      product.sku &&
      baseProduct.sku &&
      product.sku.toUpperCase() === baseProduct.sku.toUpperCase()
    ) {
      if (LOG) console.log("Exact SKU match found:", product.sku);
      return product;
    }

    const nameSimilarity = getStringSimilarity(baseProduct.name, product.name);
    // If name similarity is very low, skip image check (optional optimization)
    if (nameSimilarity < 0.5) continue;

    const imageSimilarity = await getImageSimilarity(
      baseProduct.image || "",
      product.image || ""
    );
    const score = NAME_WEIGHT * nameSimilarity + IMAGE_WEIGHT * imageSimilarity;

    if (LOG) {
      console.log(
        `Comparing to product SKU: ${product.sku}, NameSim: ${nameSimilarity}, ImgSim: ${imageSimilarity}, Score: ${score}`
      );
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = product;
    }
  }

  if (LOG) {
    if (bestMatch && bestScore >= MIN_SCORE) {
      console.log(`Best match found: ${bestMatch.sku} with score ${bestScore}`);
    } else if (bestMatch) {
      console.log(
        `Closest match (below threshold): ${bestMatch.sku} with score ${bestScore}`
      );
    } else {
      console.log("No match found.");
    }
  }

  // Only return if above threshold, otherwise null
  return bestScore >= MIN_SCORE ? bestMatch : null;
}
