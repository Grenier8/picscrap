import puppeteer from "puppeteer-extra";
import fs from "fs";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {
  Webpage,
  ProductScrap,
  Brand,
  ProductDB,
  BaseProductDB,
  BaseProductScrap,
} from "../interfaces";
import delay from "../utils/delay";
import { createDir, saveProductsToFile } from "../utils/fileManager";
import { getWebpageById } from "../api/webpages";
import { upsertProducts } from "../api/products";

puppeteer.use(StealthPlugin());

const webpageId = 4;
const maxPages = 64;

const searchProduct = async (search: string) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  await page.goto(
    `https://davidandjoseph.cl/index.php?route=product/search&search=&description=true`
  );

  await page.screenshot({ path: "1.png" });

  await page.type('input[name="search"]', search);

  await page.screenshot({ path: "2.png" });
  await page.click('button[class="search-button"]');

  // await page.waitForSelector('h1[class="title page-title"]', {});

  // await page.waitForSelector('img', { visible: true });

  await page.screenshot({ path: "3.png" });

  const data = await page.evaluate(() => {
    const images = document.querySelectorAll("img");
    const urls = Array.from(images).map((img) => img.src);
    return urls;
  });

  await browser.close();
  console.log(data);
  return data;
};

export const getProducts = async (): Promise<ProductScrap[]> => {
  const webpage = await getWebpageById(webpageId);

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

      await page.screenshot({
        path: `scans/${webpage.id}/page-${currentPage}.png`,
      });

      const products = await page.evaluate(() => {
        const items: ProductScrap[] = [];
        const productBlocks = document.querySelectorAll(".product-layout");

        productBlocks.forEach((block) => {
          const name =
            (block.querySelector(".name a") as HTMLElement)?.innerText.trim() ||
            null;
          const link =
            (block.querySelector(".name a") as HTMLAnchorElement)?.href || null;
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
            webpage: webpage.url,
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

  saveProductsToFile(allProducts, webpage.id);

  await browser.close();

  return allProducts;
};

export const getProductsBySku = async (
  skus: string[]
): Promise<ProductScrap[]> => {
  const webpage = await getWebpageById(webpageId);

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
            (block.querySelector(".name a") as HTMLElement)?.innerText.trim() ||
            null;
          const link =
            (block.querySelector(".name a") as HTMLAnchorElement)?.href || null;
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
};

export const getBaseProducts = async (baseProducts: BaseProductDB[]) => {
  const webpage = await getWebpageById(webpageId);

  const allProducts: BaseProductScrap[] = [];

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  const baseUrl = `${webpage.url}/index.php?route=product/search`;

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  for (const baseProduct of baseProducts) {
    let currentPage = 1;

    while (true) {
      // Sanitize SKU for URL and file path
      const encodedSku = encodeURIComponent(baseProduct.sku);
      const safeSku = baseProduct.sku.replace(/[\/\\?%*:|"<>]/g, "_");
      const url = `${baseUrl}&search=${encodedSku}&description=true&limit=100&page=${currentPage}`;
      console.log(`Navigating to ${url}`);

      try {
        await page.goto(url, { waitUntil: "networkidle2" });

        const dir = `scans/${webpage.name}/base-${safeSku}`;
        createDir(dir);
        await page.screenshot({
          path: `${dir}/page-${currentPage}.png`,
        });

        const product: ProductScrap | null = await page.evaluate(
          (skuToFind) => {
            const productBlocks = document.querySelectorAll(".product-layout");
            const found = Array.from(productBlocks).find((block) => {
              const sku =
                (
                  block.querySelector(
                    ".stat-2 span:nth-child(2)"
                  ) as HTMLElement
                )?.innerText
                  .trim()
                  .toUpperCase() || null;
              return sku === skuToFind;
            });
            if (!found) return null;
            const name =
              (
                found.querySelector(".name a") as HTMLElement
              )?.innerText.trim() || null;
            const link =
              (found.querySelector(".name a") as HTMLAnchorElement)?.href ||
              null;
            const price =
              (found.querySelector(".price-normal") as HTMLElement)?.innerText
                .trim()
                .replace("CL$", "$") ||
              (found.querySelector(".price-new") as HTMLElement)?.innerText
                .trim()
                .replace("CL$", "$") ||
              null;
            const outOfStock = found.classList.contains("out-of-stock");
            const image =
              (found.querySelector(".img-first") as HTMLImageElement)?.src ||
              null;
            const brand =
              (
                found.querySelector(".stat-1 a") as HTMLElement
              )?.innerText.trim() || null;

            return {
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
              brand,
              sku: skuToFind,
            } as ProductScrap;
          },
          baseProduct.sku
        );

        if (product) {
          const productWithWebpage = {
            ...product,
            webpage: webpage.url,
          } as BaseProductScrap;
          allProducts.push(productWithWebpage);
          break; // Found the product, stop paging
        }

        // Check if there are any products at all on this page; if not, stop paging
        const hasProducts = await page.evaluate(() => {
          return document.querySelectorAll(".product-layout").length > 0;
        });
        if (!hasProducts) {
          break;
        }
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
  }

  console.log("All products obtained: ", allProducts.length);

  saveProductsToFile(allProducts, webpage.id);

  // await upsertProducts(
  //   allProducts.map(
  //     (product) =>
  //       ({
  //         ...product,
  //         webpage: webpage,
  //         brand: {
  //           name: product.brand?.toUpperCase(),
  //         } as Brand,
  //       } as ProductDB)
  //   )
  // );

  await browser.close();
};
