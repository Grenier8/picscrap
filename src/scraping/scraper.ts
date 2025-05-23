import { BaseProductDB, ProductScrap, Webpage } from "../interfaces";

export interface Scraper {
  webpage: Webpage;
  getAllProducts(): Promise<ProductScrap[]>;
  getProductsBySku(skus: string[]): Promise<ProductScrap[]>;
  getProductsBySimilarity(
    baseProducts: BaseProductDB[]
  ): Promise<ProductScrap[]>;
}
