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
import { Browser, Page } from "puppeteer";
import { getBestMatch } from "../utils/similarity/productSimilarity";

puppeteer.use(StealthPlugin());

export class RincónFotográficoScraper implements Scraper {
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
    const allProducts: ProductScrap[] = await this.scrapeAllPages(
      browser,
      page
    );
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
    const allProducts: ProductScrap[] = await this.scrapeAllPages(
      browser,
      page
    );
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
    const baseUrl = `${this.webpage.url}/search?q=&page=`;
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
        const productBlocks = await page.$$(".product-block");
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
          // Helper to get stock
          const getStock = async (selector: string): Promise<boolean> => {
            const el = await block.$(selector);
            if (!el) return false;
            const dataStock = await el.evaluate((e) =>
              e.getAttribute("data-stock")
            );
            return dataStock !== "0";
          };

          const name = await getText(".product-block__name");
          const link = await getHref(".product-block__anchor");
          let priceRaw = null;
          const priceEl = await block.$(".price_method_block_price");
          if (priceEl) {
            priceRaw = await priceEl.evaluate(
              (e) => e.childNodes[0]?.textContent?.trim() || null
            );
          }
          const outOfStock = await getStock(".product-block__input");
          const image = await getSrc("img.product-block__image");
          const brand = await getText(".product-block__brand");
          let sku = await getText(".sku");

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
            brand:
              brand && brand.trim() !== "" ? brand.toUpperCase() : "UNKNOWN",
            sku: sku?.toUpperCase() ?? "unknown",
            webpage: this.webpage.url,
          } as ProductScrap);
        }
        if (products.length === 0) {
          break;
        }
        const productsWithWebpage = products.map((product: ProductScrap) => ({
          ...product,
          webpage: this.webpage.url,
        }));
        allProducts.push(...productsWithWebpage);
        currentPage++;
        await delay(2);
      } catch (error: any) {
        console.error(`Error navigating to ${url}:`, error);
        if (error.message.includes("429")) {
          console.log("HTTP 429 encountered. Retrying with backoff...");
          await delay(5 * currentPage);
          continue;
        } else {
          console.error(`Error navigating to ${url}:`, error);
          break;
        }
      }
    }
    return allProducts;
  }
}
