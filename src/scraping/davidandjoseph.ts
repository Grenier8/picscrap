import puppeteer from "puppeteer-extra";
import fs from "fs";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Webpage, ProductScrap, Brand, ProductDB } from "../interfaces";
import delay from "../utils/delay";
import { saveProductsToFile } from "../utils/fileManager";
import { getWebpageById } from "../api/webpages";
import { upsertProducts } from "../api/products";

puppeteer.use(StealthPlugin());

const webpageId = 4;

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

export const getProducts = async () => {
  const webpage = await getWebpageById(webpageId);

  const baseUrl =
    "https://davidandjoseph.cl/index.php?route=product/search&search=&description=true&page=";
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
            brand,
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

  await upsertProducts(
    allProducts.map(
      (product) =>
        ({
          ...product,
          webpage: webpage,
          brand: {
            name: product.brand?.toUpperCase(),
          } as Brand,
        } as ProductDB)
    )
  );

  await browser.close();
};
