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
import { createLimiter } from "../utils/limiter";
import { getBestMatch } from "../utils/similarity/productSimilarity";
import { Browser, Page } from "puppeteer";

puppeteer.use(StealthPlugin());

export class AperturaScraper extends Scraper {
  constructor(webpage: Webpage) {
    super(webpage);
  }

  async scrapeAllPages(): Promise<ProductScrap[]> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await this.setUserAgent(page);

    const allProducts: ProductScrap[] = [];
    let currentPage = 1;

    await page.goto(this.webpage.url, { waitUntil: "networkidle2" });

    const dir = `scans/${this.webpage.name}`;
    createDir(dir);
    await page.screenshot({ path: `${dir}/page-0.png` });

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
          path: `${dir}/page-${currentPage}.png`,
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
                  brand: brand?.toUpperCase() ?? "UNKNOWN",
                  sku: sku?.toUpperCase() ?? "unknown",
                } as ProductScrap;
              })
            )
          );

          const productsWithWebpage = items.map((product) => ({
            ...product,
            webpage: this.webpage.url,
          }));

          allProducts.push(...productsWithWebpage);
        }

        currentPage++;
        await delay(2);
      } catch (error: any) {
        await this.logPageScrapError(menuLink, error.message);
        if (error.message.includes("429")) {
          await delay(5 * currentPage);
          continue;
        } else {
          break;
        }
      }
    }
    await browser.close();
    return allProducts;
  }
}
