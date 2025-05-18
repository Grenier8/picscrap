import { Page, ProductDB } from "../interfaces";

export const getProducts = async (page: Page): Promise<ProductDB[]> => {
  const fetchedProducts = await fetch(
    `http://localhost:${page.dbPort}/products`
  );
  const products = (await fetchedProducts.json()) as ProductDB[];

  return products;
};
