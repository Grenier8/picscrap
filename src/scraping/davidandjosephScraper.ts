import puppeteer from "puppeteer-extra";
import fs from "fs";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {
  Webpage,
  ProductScrap,
  Brand,
  ProductDB,
  BaseProductDB,
} from "../interfaces";
import delay from "../utils/delay";
import { createDir, saveProductsToFile } from "../utils/fileManager";
import { getWebpageById } from "../api/webpages";
import { upsertProducts } from "../api/products";
import { Scraper } from "./scraper";
import { getBestMatch } from "../utils/similarity/productSimilarity";
import { Browser, Page } from "puppeteer";

puppeteer.use(StealthPlugin());

export class DavidAndJosephScraper implements Scraper {
  webpage: Webpage;

  constructor(webpage: Webpage) {
    this.webpage = webpage;
  }

  async getAllProducts(): Promise<ProductScrap[]> {
    console.log(`Started ${this.webpage.name} scraping`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await this.setUserAgent(page);
    const allProducts = await this.scrapeAllPages(browser, page);
    console.log("All products obtained: ", allProducts.length);

    saveProductsToFile(allProducts, this.webpage.id);
    await browser.close();
    console.log(`Ended ${this.webpage.name} scraping`);
    return allProducts;
  }

  async getProductsBySku(skus: string[]): Promise<ProductScrap[]> {
    console.log(`Started ${this.webpage.name} scraping`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await this.setUserAgent(page);
    const allProducts = await this.scrapeAllPages(browser, page);
    console.log("All products obtained: ", allProducts.length);

    const filteredProducts = allProducts.filter((product: ProductScrap) =>
      skus.includes(product.sku)
    );
    console.log("Filtered products: ", filteredProducts.length);

    saveProductsToFile(filteredProducts, this.webpage.id);
    await browser.close();
    console.log(`Ended ${this.webpage.name} scraping`);
    return filteredProducts;
  }

  async getProductsBySimilarity(
    baseProducts: BaseProductDB[]
  ): Promise<ProductScrap[]> {
    console.log(`Started ${this.webpage.name} scraping`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await this.setUserAgent(page);
    const allProducts = await this.scrapeAllPages(browser, page);
    console.log("All products obtained: ", allProducts.length);

    const filteredProducts: ProductScrap[] = [];
    for (const baseProduct of baseProducts) {
      const bestMatch = await getBestMatch(baseProduct, allProducts, {
        imageWeight: baseProduct.image ? 0.3 : 0,
      });
      if (bestMatch) {
        filteredProducts.push({
          ...bestMatch,
          webpage: this.webpage.url,
          baseProductSku: baseProduct.sku,
        });
      }
    }
    console.log("Filtered products: ", filteredProducts.length);

    saveProductsToFile(filteredProducts, this.webpage.id);
    await browser.close();
    console.log(`Ended ${this.webpage.name} scraping`);
    return filteredProducts;
  }

  private async setUserAgent(page: Page) {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );
  }

  async scrapeAllPages(browser: Browser, page: Page): Promise<ProductScrap[]> {
    const baseUrl = `${this.webpage.url}/index.php?route=product/search&search=&description=true&limit=100&page=`;
    let currentPage = 1;
    const allProducts: ProductScrap[] = [];
    while (true) {
      const url = `${baseUrl}${currentPage}`;
      console.log(`Navigating to ${url}`);
      try {
        await page.goto(url, { waitUntil: "networkidle2" });
        const dir = `scans/${this.webpage.name}`;
        createDir(dir);
        await page.screenshot({
          path: `${dir}/page-${currentPage}.png`,
        });
        const productBlocks = await page.$$(".product-layout");
        const products: ProductScrap[] = [];
        for (const block of productBlocks) {
          // Helper to get innerText
          const getText = async (selector: string): Promise<string | null> => {
            const el = await block.$(selector);
            if (!el) return null;
            const text = await el.evaluate((e) =>
              (e as HTMLElement).innerText.trim()
            );
            return text || null;
          };
          // Helper to get href
          const getHref = async (selector: string): Promise<string | null> => {
            const el = await block.$(selector);
            if (!el) return null;
            const href = await el.evaluate(
              (e) => (e as HTMLAnchorElement).href
            );
            return href || null;
          };
          // Helper to get src
          const getSrc = async (selector: string): Promise<string | null> => {
            const el = await block.$(selector);
            if (!el) return null;
            const src = await el.evaluate((e) => (e as HTMLImageElement).src);
            return src || null;
          };

          const name = await getText(".name a");
          const link = await getHref(".name a");
          let priceRaw = await getText(".price-normal");
          if (!priceRaw) {
            priceRaw = await getText(".price-new");
          }
          if (priceRaw) {
            priceRaw = priceRaw.replace("CL$", "$");
          }
          const outOfStock = await block.evaluate((e) =>
            e.classList.contains("out-of-stock")
          );
          const image = await getSrc(".img-first");
          const brand = await getText(".stat-1 a");
          let sku = await getText(".stat-2 span:nth-child(2)");

          products.push({
            name: name ?? "",
            link: link ?? "",
            price: priceRaw
              ? parseFloat(
                  priceRaw
                    .replace(/\n/g, "")
                    .replace(/,/g, "")
                    .replace(/\./g, "")
                    .replace(/\$/g, "")
                    .trim()
                )
              : NaN,
            outOfStock,
            image: image ?? "",
            brand: brand?.toUpperCase() ?? "UNKNOWN",
            sku: sku?.toUpperCase() ?? "unknown",
            webpage: this.webpage.url,
          } as ProductScrap);
        }
        if (!products || products.length === 0) {
          break;
        }
        const productsWithWebpage = products.map((product: any) => ({
          ...product,
          webpage: this.webpage.url,
        }));
        allProducts.push(...productsWithWebpage);
        currentPage++;
        await delay(2);
      } catch (error: any) {
        console.error(`Error navigating to ${url}:`, error);
        if (error.message && error.message.includes("429")) {
          console.log("HTTP 429 encountered. Retrying with backoff...");
          await delay(5 * currentPage);
          continue;
        } else {
          break;
        }
      }
    }
    return allProducts;
  }
}
