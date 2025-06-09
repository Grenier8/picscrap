import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { ProductScrap, Webpage } from "../interfaces";
import delay from "../utils/delay";
import { createDir } from "../utils/fileManager";
import { Scraper } from "./scraper";

puppeteer.use(StealthPlugin());

export class PicslabScraper extends Scraper {
  constructor(webpage: Webpage) {
    super(webpage);
  }

  async scrapeAllPages(): Promise<ProductScrap[]> {
    const browser = await this.createBrowser();
    const page = await browser.newPage();
    await this.setUserAgent(page);

    const baseUrl = `${this.webpage.url}/search?q=&page=`;
    let currentPage = 1;
    const allProducts: ProductScrap[] = [];
    while (true) {
      const url = `${baseUrl}${currentPage}`;
      this.logInfo(`Navigating to ${url}`);
      try {
        try {
          await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 60000,
          });
        } catch (error: any) {
          await this.logPageScrapError(url, error.message);
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
        }

        if (process.env.NODE_ENV === "development") {
          const dir = `scans/${this.webpage.name}`;
          createDir(dir);
          await page.screenshot({ path: `${dir}/page-${currentPage}.png` });
        }

        const productBlocks = await page.$$("article.product-block");
        const products: ProductScrap[] = [];

        for (const block of productBlocks) {
          const getText = async (selector: string): Promise<string | null> => {
            const el = await block.$(selector);
            if (!el) return null;
            const text = await el.evaluate((e) =>
              (e as HTMLElement).innerText.trim()
            );
            return text || null;
          };
          const getHref = async (selector: string): Promise<string | null> => {
            const el = await block.$(selector);
            if (!el) return null;
            const href = await el.evaluate(
              (e) => (e as HTMLAnchorElement).href
            );
            return href || null;
          };
          const getSrc = async (selector: string): Promise<string | null> => {
            const el = await block.$(selector);
            if (!el) return null;
            const src = await el.evaluate((e) => (e as HTMLImageElement).src);
            return src || null;
          };

          const name = await getText(".product-block__name");
          const link = await getHref(".product-block__anchor");
          let priceRaw = await getText(".product-block__price");
          const outOfStock = null;
          const image = await getSrc("img.product-block__image");
          const brand = await getText(".product-block__brand");
          let sku = await getText(".product-block__sku");

          if (link && !priceRaw) {
            const productPage = await browser.newPage();
            try {
              try {
                await productPage.goto(link, {
                  waitUntil: "networkidle2",
                  timeout: 60000,
                });
              } catch (error: any) {
                await this.logProductScrapError(link, error.message);
                await productPage.goto(link, {
                  waitUntil: "domcontentloaded",
                  timeout: 30000,
                });
              }
              const priceEl = await productPage.$(".product_price");
              priceRaw = priceEl
                ? await priceEl.evaluate((e) => (e as HTMLElement).innerText)
                : null;
            } catch (error: any) {
              await this.logProductScrapError(link, error.message);
            } finally {
              await productPage.close();
            }
          }

          const price = priceRaw
            ? parseFloat(
                priceRaw
                  .replace(/\n/g, "")
                  .replace(/,/g, "")
                  .replace(/\./g, "")
                  .replace(/\$/g, "")
                  .trim()
              )
            : null;
          products.push({
            name: name ?? "",
            link: link ?? "",
            price: price ?? NaN,
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
      } catch (error: any) {
        await this.logPageScrapError(url, error.message);
        if (error.message.includes("429")) {
          await delay(5);
        }
        continue;
      }
    }
    return allProducts;
  }
}
