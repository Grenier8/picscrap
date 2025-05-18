import puppeteer from "puppeteer-extra";
import fs from "fs";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Webpage, ProductScrap, Brand, ProductDB } from "../interfaces";
import delay from "../utils/delay";
import { saveProductsToFile } from "../utils/fileManager";
import { getWebpageById } from "../api/webpages";
import { upsertProducts } from "../api/products";

puppeteer.use(StealthPlugin());

const webpageId = 2;

export const getProducts = async () => {
  const webpage = await getWebpageById(webpageId);

  const baseUrl = `${webpage.url}/search?q=&page=`;
  let currentPage = 26;
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
        path: `scans/${webpage.name}/page-${currentPage}.png`,
      });

      const products = await page.evaluate(() => {
        const items: ProductScrap[] = [];
        const productBlocks = document.querySelectorAll(
          "article.product-block"
        );

        productBlocks.forEach((block) => {
          const name =
            (
              block.querySelector(".product-block__name") as HTMLElement
            )?.innerText.trim() || null;
          const link =
            (block.querySelector(".product-block__anchor") as HTMLAnchorElement)
              ?.href || null;
          const price =
            (
              block.querySelector(".product-block__price") as HTMLElement
            )?.innerText
              .replace(/\n/g, "")
              .replace(/,/g, "")
              .replace(/\./g, "")
              .replace(/\$/g, "")
              .trim() || null;

          const outOfStock = null;
          const image =
            (
              block.querySelector(
                "img.product-block__image"
              ) as HTMLImageElement
            )?.src || null;
          const brand =
            (
              block.querySelector(".product-block__brand") as HTMLElement
            )?.innerText.trim() || null;
          const sku =
            (
              block.querySelector(".product-block__sku") as HTMLElement
            )?.innerText.trim() || null;

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
            sku,
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

  await upsertProducts(
    allProducts.map(
      (product) =>
        ({
          ...product,
          webpage: webpage,
          brand: {
            name: product.brand,
          } as Brand,
        } as ProductDB)
    )
  );

  await browser.close();
};
