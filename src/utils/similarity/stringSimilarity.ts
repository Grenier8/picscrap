import {
  BaseProductDB,
  BaseProductScrap,
  ProductScrap,
} from "../../interfaces";
import natural from "natural";

export function isSameProduct(p1: ProductScrap, p2: BaseProductDB) {
  const nameSimilarity = natural.JaroWinklerDistance(p1.name, p2.name);
  const brandMatch = p1.brand.toUpperCase() === p2.Brand.name.toUpperCase();
  // const skuMatch = p1.sku === p2.sku;

  const similars = nameSimilarity > 0.75 && brandMatch;

  if (similars) {
    console.log(`Similar: ${p1.name} <-> ${p2.name}`);
  }

  return similars;
}

export function getBestMatch(
  baseProduct: BaseProductDB,
  products: BaseProductScrap[]
): BaseProductScrap | null {
  let bestMatch: BaseProductScrap | null = null;
  let bestSimilarity = 0;

  for (const product of products) {
    if (product.sku.toUpperCase() === baseProduct.sku.toUpperCase()) {
      return product;
    }

    const brandMatch =
      baseProduct.Brand.name.toUpperCase() === product.brand.toUpperCase();

    const similarity = natural.JaroWinklerDistance(
      baseProduct.name,
      product.name
    );
    if (similarity > bestSimilarity && brandMatch && similarity >= 0.9) {
      bestSimilarity = similarity;
      bestMatch = product;
    }
  }

  // console.log(
  //   `Best match: ${baseProduct.name} <-> ${bestMatch?.name} = ${bestSimilarity}`
  // );

  return bestMatch;
}

export function getStringSimilarityJaroWinkler(
  str1: string,
  str2: string
): number {
  return natural.JaroWinklerDistance(str1, str2);
}

export function getStringSimilarityDiceCoefficient(
  str1: string,
  str2: string
): number {
  return natural.DiceCoefficient(str1, str2);
}

// export function getStringSimilarity(str1: string, str2: string): number {
//   const fuse = new Fuse([str1], { includeScore: true, threshold: 0.4 });

//   const result = fuse.search(str2);
//   console.log(result);

//   return result[0]?.score ?? 0;
// }
