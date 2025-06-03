import {
  Webpage,
  ProductDB,
  ProductScrap,
  BaseProductScrap,
} from "../interfaces";

export const getScrapProducts = async (
  page: Webpage
): Promise<ProductScrap[]> => {
  const fetchedProducts = await fetch(
    `http://localhost:300${page.id}/products`
  );
  const products = (await fetchedProducts.json()) as ProductScrap[];
  console.log("Products obtainedddd: ", products.length);

  return products;
};

export const getBaseProducts = async (): Promise<BaseProductScrap[]> => {
  const fetchedProducts = await fetch(`http://localhost:3005/products`);
  const products = (await fetchedProducts.json()) as BaseProductScrap[];

  return products;
};
