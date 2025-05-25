import { Webpage, ProductDB } from "../interfaces";

export const getProducts = async (page: Webpage): Promise<ProductDB[]> => {
  const fetchedProducts = await fetch(`http://localhost:${page.id}/products`);
  const products = (await fetchedProducts.json()) as ProductDB[];

  return products;
};
