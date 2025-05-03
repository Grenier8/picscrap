import { Page, Product } from "../interfaces";

export const getProducts = async (page: Page): Promise<Product[]> => {
    const fetchedProducts = await fetch(`http://localhost:${page.dbPort}/products`);
    const products = await fetchedProducts.json() as Product[];

    return products;
}
