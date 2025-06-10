import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { ProductScrap, Webpage } from "../interfaces";
import delay from "../utils/delay";
import { createDir } from "../utils/fileManager";
import { createLimiter } from "../utils/limiter";
import { Scraper } from "./scraper";

puppeteer.use(StealthPlugin());

export class PicslabScraper extends Scraper {
  constructor(webpage: Webpage) {
    super(webpage);
  }

  async scrapeAllPages(): Promise<ProductScrap[]> {
    let browser = await this.createBrowser();
    let page = await browser.newPage();
    await this.setUserAgent(page);

    const baseUrl = `${this.webpage.url}/search?q=&page=`;
    let currentPage = 1;
    const allProducts: ProductScrap[] = [];
    while (true) {
      const url = `${baseUrl}${currentPage}`;
      this.logInfo(`Navigating to ${url}`);
      try {
        await page.goto(url, {
          waitUntil: "networkidle2",
          timeout: 300000,
        });

        if (process.env.NODE_ENV === "development") {
          const dir = `scans/${this.webpage.name}`;
          createDir(dir);
          await page.screenshot({ path: `${dir}/page-${currentPage}.png` });
        }

        const productBlocks = await page.$$("article.product-block");

        const limit = createLimiter(5);

        const products: ProductScrap[] = await Promise.all(
          productBlocks.map(async (block) =>
            limit(async () => {
              const getText = async (
                selector: string
              ): Promise<string | null> => {
                const el = await block.$(selector);
                if (!el) return null;
                const text = await el.evaluate((e) =>
                  (e as HTMLElement).innerText.trim()
                );
                return text || null;
              };
              const getHref = async (
                selector: string
              ): Promise<string | null> => {
                const el = await block.$(selector);
                if (!el) return null;
                const href = await el.evaluate(
                  (e) => (e as HTMLAnchorElement).href
                );
                return href || null;
              };
              const getSrc = async (
                selector: string
              ): Promise<string | null> => {
                const el = await block.$(selector);
                if (!el) return null;
                const src = await el.evaluate(
                  (e) => (e as HTMLImageElement).src
                );
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
                  await productPage.goto(link, {
                    waitUntil: "networkidle2",
                    timeout: 300000,
                  });

                  if (process.env.NODE_ENV === "development") {
                    const dir = `scans/${this.webpage.name}/${sku}`;
                    createDir(dir);
                    await productPage.screenshot({
                      path: `${dir}/product.png`,
                    });
                  }

                  const priceEl = await productPage.$(".product_price");
                  priceRaw = priceEl
                    ? await priceEl.evaluate(
                        (e) => (e as HTMLElement).innerText
                      )
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

              return {
                name: name ?? "",
                link: link ?? "",
                price: price ?? NaN,
                outOfStock,
                image: image ?? "",
                brand: brand?.toUpperCase() ?? "UNKNOWN",
                sku: sku?.toUpperCase() ?? "unknown",
                webpage: this.webpage.url,
              } as ProductScrap;
            })
          )
        );

        if (!products || products.length === 0) {
          break;
        }
        const productsWithWebpage = products.map((product: any) => ({
          ...product,
          webpage: this.webpage.url,
        }));
        allProducts.push(...productsWithWebpage);
        currentPage++;
        await delay(1);
      } catch (error: any) {
        await this.logPageScrapError(url, error.message);
        if (error.message.includes("429")) {
          await delay(5);
        }
        continue;
      }
    }
    await page.close();
    await browser.close();
    return allProducts;
  }
}
