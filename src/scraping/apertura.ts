import puppeteer from "puppeteer-extra";
import fs from "fs";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Webpage, ProductScrap, Brand, ProductDB } from "../interfaces";
import delay from "../utils/delay";
import { saveProductsToFile } from "../utils/fileManager";
import { createLimiter } from "../utils/limiter";
import { getWebpageById } from "../api/webpages";
import { upsertProducts } from "../api/products";

puppeteer.use(StealthPlugin());

const webpageId = 1;

export const getProducts = async () => {
  const webpage = await getWebpageById(webpageId);

  const allProducts: ProductScrap[] = [];
  let currentPage = 1;

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
  );

  await page.goto(webpage.url, { waitUntil: "networkidle2" });
  await page.screenshot({ path: `scans/${webpage.id}/page-0.png` });

  const links = await page.$$eval("#top-menu a", (anchors) =>
    anchors.map((a) => a.href)
  );

  for (const menuLink of links) {
    console.log(`Visitando: ${menuLink}`);

    try {
      await page.goto(`${menuLink}?resultsPerPage=120`, {
        waitUntil: "networkidle2",
      });

      await page.screenshot({
        path: `scans/${webpage.id}/page-${currentPage}.png`,
      });

      const productsFather = await page.$("#js-product-list");
      if (productsFather) {
        const products = await page.$$("article.product-miniature");

        const limit = createLimiter(5);

        const items: ProductScrap[] = await Promise.all(
          products.map(async (product) =>
            limit(async () => {
              const name = await product
                .$eval(
                  "h3.product-title a",
                  (el) => el.textContent?.trim() || null
                )
                .catch(() => null);
              const link = await product
                .$eval(
                  "h3.product-title a",
                  (el) => (el as HTMLAnchorElement).href
                )
                .catch(() => null);
              const price = await product
                .$eval(
                  "span.price",
                  (el) => el.textContent?.trim().replace(/\n/g, "") || null
                )
                .catch(() => null);
              const outOfStock = await product
                .evaluate((el) => el.classList.contains("out-of-stock"))
                .catch(() => null);
              const image = await product
                .$eval('meta[itemprop="image"]', (el) =>
                  el.getAttribute("content")
                )
                .catch(() => null);
              const brand = await product
                .$eval('div[itemprop="brand"] meta[itemprop="name"]', (el) =>
                  el.getAttribute("content")
                )
                .catch(() => null);

              let sku = null;

              if (link) {
                const productPage = await browser.newPage();
                try {
                  await productPage.goto(link, { waitUntil: "networkidle2" });
                  sku = await productPage
                    .$eval('section#main meta[itemprop="sku"]', (el) =>
                      el.getAttribute("content")
                    )
                    .catch(() => null);
                } catch (error) {
                  console.error(`❌ Error en ${link}:`, error);
                } finally {
                  await productPage.close();
                }
              }

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
                brand: brand?.toUpperCase(),
                sku,
              } as ProductScrap;
            })
          )
        );

        const productsWithWebpage = items.map((product) => ({
          ...product,
          webpage: webpage.url,
        }));

        allProducts.push(...productsWithWebpage);
      }

      currentPage++;
      await delay(2);
    } catch (error: any) {
      if (error.message.includes("429")) {
        console.log("HTTP 429 encountered. Retrying with backoff...");
        await delay(5 * currentPage);
        continue;
      } else {
        console.error(`Error navigating to ${menuLink}:`, error);
        break;
      }
    }
  }

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
