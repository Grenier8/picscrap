import {
  FindProductsBetweenPagesResults,
  Webpage,
  ProductDB,
} from "../interfaces";
import { getProducts } from "../service/product";

export const findProductsBetweenPages = async (
  pageFrom: Webpage,
  pageTo: Webpage
): Promise<FindProductsBetweenPagesResults> => {
  const pageFromProducts = await getProducts(pageFrom);
  const pageToProducts = await getProducts(pageTo);

  const totalProducts = pageFromProducts.length;
  let foundProducts = 0;
  const notFoundProducts: ProductDB[] = [];
  for (const product of pageFromProducts) {
    const foundProduct = pageToProducts.find((p) => p.sku === product.sku);
    if (foundProduct) {
      foundProducts++;
    } else {
      notFoundProducts.push(product);
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
