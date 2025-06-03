import {
  FindProductsBetweenPagesResults,
  Webpage,
  ProductDB,
} from "../interfaces";
import { getScrapProducts } from "../service/product";

export const findProductsBetweenPages = async (
  pageFrom: Webpage,
  pageTo: Webpage
): Promise<FindProductsBetweenPagesResults> => {
  const pageFromProducts = await getScrapProducts(pageFrom);
  const pageToProducts = await getScrapProducts(pageTo);

  const totalProducts = pageFromProducts.length;
  let foundProducts = 0;
  const notFoundProducts: ProductDB[] = [];
  for (const product of pageFromProducts) {
    const foundProduct = pageToProducts.find((p) => p.sku === product.sku);
    if (foundProduct) {
      foundProducts++;
    } else {
      notFoundProducts.push({
        ...product,
        Webpage: pageTo,
        Brand: { name: product.brand },
      } as ProductDB);
    }
  }

  return {
    status: foundProducts != totalProducts ? "partial" : "success",
    totalProducts,
    foundProducts,
    notFoundProducts,
    date: new Date().toISOString(),
  } as FindProductsBetweenPagesResults;
};
