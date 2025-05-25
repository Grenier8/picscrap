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
import { getBestMatch, isSameProduct } from "../utils/stringSimilarity";

puppeteer.use(StealthPlugin());

export class DavidAndJosephScraper implements Scraper {
  webpage: Webpage;

  constructor(webpage: Webpage) {
    this.webpage = webpage;
  }

  async getAllProducts(): Promise<ProductScrap[]> {
    console.log(`Started ${this.webpage.name} scraping`);

    const baseUrl = `${this.webpage.url}/index.php?route=product/search&search=&description=true&limit=100&page=`;
    let currentPage = 1;
    const allProducts: ProductScrap[] = [];

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    while (true) {
      const url = `${baseUrl}${currentPage}`;
      console.log(`Navigating to ${url}`);

      try {
        await page.goto(url, { waitUntil: "networkidle2" });

        await page.screenshot({
          path: `scans/${this.webpage.id}/page-${currentPage}.png`,
        });

        const products = await page.evaluate(() => {
          const items: ProductScrap[] = [];
          const productBlocks = document.querySelectorAll(".product-layout");

          productBlocks.forEach((block) => {
            const name =
              (
                block.querySelector(".name a") as HTMLElement
              )?.innerText.trim() || null;
            const link =
              (block.querySelector(".name a") as HTMLAnchorElement)?.href ||
              null;
            const price =
              (block.querySelector(".price-normal") as HTMLElement)?.innerText
                .trim()
                .replace("CL$", "$") ||
              (block.querySelector(".price-new") as HTMLElement)?.innerText
                .trim()
                .replace("CL$", "$") ||
              null;
            const outOfStock = block.classList.contains("out-of-stock");
            const image =
              (block.querySelector(".img-first") as HTMLImageElement)?.src ||
              null;
            const brand =
              (
                block.querySelector(".stat-1 a") as HTMLElement
              )?.innerText.trim() || null;
            const sku =
              (
                block.querySelector(".stat-2 span:nth-child(2)") as HTMLElement
              )?.innerText
                .trim()
                .toUpperCase() || null;

            items.push({
              name,
              link,
              price: price
                ? parseFloat(
                    price
                      .replace(/\n/g, "")
                      .replace(/,/g, "")
                      .replace(/\./g, "")
                      .replace(/\$/g, "")
                      .trim()
                  )
                : null,
              outOfStock,
              webpage: this.webpage.url,
              image,
              brand: brand?.toUpperCase(),
              sku: sku?.toUpperCase(),
            } as ProductScrap);
          });

          return items;
        });

        if (products.length === 0) {
          break;
        }

        const productsWithWebpage = products.map((product) => ({
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

    console.log("All products obtained: ", allProducts.length);

    saveProductsToFile(allProducts, this.webpage.id);

    await browser.close();

    return allProducts;
  }

  async getProductsBySku(skus: string[]): Promise<ProductScrap[]> {
    const webpage = await getWebpageById(this.webpage.id);

    console.log(`Started ${webpage.name} scraping`);

    const baseUrl = `${webpage.url}/index.php?route=product/search&search=&description=true&limit=100&page=`;
    let currentPage = 1;
    const allProducts: ProductScrap[] = [];

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    while (true) {
      const url = `${baseUrl}${currentPage}`;
      console.log(`Navigating to ${url}`);

      try {
        await page.goto(url, { waitUntil: "networkidle2" });

        const dir = `scans/${webpage.name}`;
        createDir(dir);
        await page.screenshot({
          path: `${dir}/page-${currentPage}.png`,
        });

        const products = await page.evaluate(() => {
          const items: ProductScrap[] = [];
          const productBlocks = document.querySelectorAll(".product-layout");

          productBlocks.forEach((block) => {
            const name =
              (
                block.querySelector(".name a") as HTMLElement
              )?.innerText.trim() || null;
            const link =
              (block.querySelector(".name a") as HTMLAnchorElement)?.href ||
              null;
            const price =
              (block.querySelector(".price-normal") as HTMLElement)?.innerText
                .trim()
                .replace("CL$", "$") ||
              (block.querySelector(".price-new") as HTMLElement)?.innerText
                .trim()
                .replace("CL$", "$") ||
              null;
            const outOfStock = block.classList.contains("out-of-stock");
            const image =
              (block.querySelector(".img-first") as HTMLImageElement)?.src ||
              null;
            const brand =
              (
                block.querySelector(".stat-1 a") as HTMLElement
              )?.innerText.trim() || null;
            const sku =
              (
                block.querySelector(".stat-2 span:nth-child(2)") as HTMLElement
              )?.innerText
                .trim()
                .toUpperCase() || null;

            items.push({
              name,
              link,
              price: price
                ? parseFloat(
                    price
                      .replace(/\n/g, "")
                      .replace(/,/g, "")
                      .replace(/\./g, "")
                      .replace(/\$/g, "")
                      .trim()
                  )
                : null,
              outOfStock,
              image,
              brand: brand?.toUpperCase() ?? "UNKNOWN",
              sku: sku?.toUpperCase() ?? "unknown",
            } as ProductScrap);
          });

          return items;
        });

        if (products.length === 0) {
          break;
        }

        const productsWithWebpage = products.map((product) => ({
          ...product,
          webpage: webpage.url,
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

    console.log("All products obtained: ", allProducts.length);

    const filteredProducts = allProducts.filter((product) =>
      skus.includes(product.sku)
    );
    console.log("Filtered products: ", filteredProducts.length);

    saveProductsToFile(filteredProducts, webpage.id);

    await browser.close();

    console.log(`Ended ${webpage.name} scraping`);

    return filteredProducts;
  }

  async getProductsBySimilarity(
    baseProducts: BaseProductDB[]
  ): Promise<ProductScrap[]> {
    const webpage = await getWebpageById(this.webpage.id);

    console.log(`Started ${webpage.name} scraping`);

    const baseUrl = `${webpage.url}/index.php?route=product/search&search=&description=true&limit=100&page=`;
    let currentPage = 1;
    const allProducts: ProductScrap[] = [];

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    while (true) {
      const url = `${baseUrl}${currentPage}`;
      console.log(`Navigating to ${url}`);

      try {
        await page.goto(url, { waitUntil: "networkidle2" });

        const dir = `scans/${webpage.name}`;
        createDir(dir);
        await page.screenshot({
          path: `${dir}/page-${currentPage}.png`,
        });

        const products = await page.evaluate(() => {
          const items: ProductScrap[] = [];
          const productBlocks = document.querySelectorAll(".product-layout");

          productBlocks.forEach((block) => {
            const name =
              (
                block.querySelector(".name a") as HTMLElement
              )?.innerText.trim() || null;
            const link =
              (block.querySelector(".name a") as HTMLAnchorElement)?.href ||
              null;
            const price =
              (block.querySelector(".price-normal") as HTMLElement)?.innerText
                .trim()
                .replace("CL$", "$") ||
              (block.querySelector(".price-new") as HTMLElement)?.innerText
                .trim()
                .replace("CL$", "$") ||
              null;
            const outOfStock = block.classList.contains("out-of-stock");
            const image =
              (block.querySelector(".img-first") as HTMLImageElement)?.src ||
              null;
            const brand =
              (
                block.querySelector(".stat-1 a") as HTMLElement
              )?.innerText.trim() || null;
            const sku =
              (
                block.querySelector(".stat-2 span:nth-child(2)") as HTMLElement
              )?.innerText
                .trim()
                .toUpperCase() || null;

            items.push({
              name,
              link,
              price: price
                ? parseFloat(
                    price
                      .replace(/\n/g, "")
                      .replace(/,/g, "")
                      .replace(/\./g, "")
                      .replace(/\$/g, "")
                      .trim()
                  )
                : null,
              outOfStock,
              image,
              brand: brand?.toUpperCase() ?? "UNKNOWN",
              sku: sku?.toUpperCase() ?? "unknown",
            } as ProductScrap);
          });

          return items;
        });

        if (products.length === 0) {
          break;
        }

        const productsWithWebpage = products.map((product) => ({
          ...product,
          webpage: webpage.url,
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

    console.log("All products obtained: ", allProducts.length);

    const filteredProducts: ProductScrap[] = [];
    baseProducts.forEach((baseProduct) => {
      const bestMatch = getBestMatch(baseProduct, allProducts);
      if (bestMatch) {
        filteredProducts.push({
          ...bestMatch,
          webpage: this.webpage.url,
          baseProductSku: baseProduct.sku,
        });
      }
    });

    console.log("Filtered products: ", filteredProducts.length);

    saveProductsToFile(filteredProducts, this.webpage.id);

    await browser.close();

    console.log(`Ended ${this.webpage.name} scraping`);

    return filteredProducts;
  }
}
