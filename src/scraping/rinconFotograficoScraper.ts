import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { ProductScrap, Webpage } from "../interfaces";
import delay from "../utils/delay";
import { Scraper } from "./scraper";

puppeteer.use(StealthPlugin());

export class RincónFotográficoScraper extends Scraper {
  constructor(webpage: Webpage) {
    super(webpage);
  }

  async scrapeAllPages(): Promise<ProductScrap[]> {
    const baseUrl = `${this.webpage.url}/search?q=&page=`;
    const browser = await this.createBrowser();
    const page = await browser.newPage();
    await this.setUserAgent(page);
    let currentPage = 1;
    const allProducts: ProductScrap[] = [];
    while (true) {
      const url = `${baseUrl}${currentPage}`;
      console.log(`Navigating to ${url}`);
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: 300000 });

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
      } catch (error: any) {
        await this.logPageScrapError(url, error.message);
        if (error.message.includes("429")) {
          await delay(5);
        }
        continue;
      }
    }
    await browser.close();
    return allProducts;
  }
}
