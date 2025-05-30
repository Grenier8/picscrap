import { Browser, Page } from "puppeteer";
import { BaseProductDB, ProductScrap, Webpage } from "../interfaces";

export interface Scraper {
  webpage: Webpage;
  getAllProducts(): Promise<ProductScrap[]>;
  getProductsBySku(skus: string[]): Promise<ProductScrap[]>;
  getProductsBySimilarity(
    baseProducts: BaseProductDB[]
  ): Promise<ProductScrap[]>;
  scrapeAllPages(browser: Browser, page: Page): Promise<ProductScrap[]>;
}
