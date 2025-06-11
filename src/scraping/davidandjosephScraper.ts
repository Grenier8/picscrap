import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { ProductScrap, Webpage } from "../interfaces";
import delay from "../utils/delay";
import { createDir } from "../utils/fileManager";
import { Scraper } from "./scraper";

puppeteer.use(StealthPlugin());

export class DavidAndJosephScraper extends Scraper {
  constructor(webpage: Webpage) {
    super(webpage);
  }

  async scrapeAllPages(): Promise<ProductScrap[]> {
    const baseUrl = `${this.webpage.url}/index.php?route=product/search&search=&description=true&limit=100&page=`;
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

        if (process.env.NODE_ENV === "development") {
          const dir = `scans/${this.webpage.name}`;
          createDir(dir);
          await page.screenshot({
            path: `${dir}/page-${currentPage}.png`,
          });
        }
        const productBlocks = await page.$$(".product-layout");
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

          const name = await getText(".name a");
          const link = await getHref(".name a");
          let priceRaw = await getText(".price-normal");
          if (!priceRaw) {
            priceRaw = await getText(".price-new");
          }
          if (priceRaw) {
            priceRaw = priceRaw.replace("CL$", "$");
          }
          const outOfStock = await block.evaluate((e) =>
            e.classList.contains("out-of-stock")
          );
          const image = await getSrc(".img-first");
          const brand = await getText(".stat-1 a");
          let sku = await getText(".stat-2 span:nth-child(2)");

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
    await page.close();
    await browser.close();
    return allProducts;
  }
}
