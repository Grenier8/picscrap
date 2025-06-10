import { Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { ProductScrap, Webpage } from "../interfaces";
import delay from "../utils/delay";
import { createDir } from "../utils/fileManager";
import { Scraper } from "./scraper";

puppeteer.use(StealthPlugin());

export class EbestScraper extends Scraper {
  constructor(webpage: Webpage) {
    super(webpage);
  }

  private async isLastPage(page: Page): Promise<boolean> {
    try {
      const paginationText = await page.$eval(
        "#toolbar-amount",
        (el: Element) => (el as HTMLElement).textContent?.trim() || ""
      );

      if (!paginationText) return true; // If no pagination element, assume it's the last page

      // Extract numbers using regex
      const matches = paginationText.match(/\d+/g);
      if (!matches || matches.length < 3) return true;

      const currentLast = parseInt(matches[1], 10);
      const total = parseInt(matches[2], 10);
      return currentLast >= total;
    } catch (error) {
      console.error("Error checking last page:", error);
      return true; // If there's an error, assume it's the last page to be safe
    }
  }

  async scrapeAllPages(): Promise<ProductScrap[]> {
    const browser = await this.createBrowser();
    const page = await browser.newPage();
    await this.setUserAgent(page);

    const allProducts: ProductScrap[] = [];
    let currentPage = 1;

    try {
      await page.goto(this.webpage.url, {
        waitUntil: "networkidle2",
        timeout: 300000,
      });

      const dir = `scans/${this.webpage.name}`;
      if (process.env.NODE_ENV === "development") {
        createDir(dir);
        await page.screenshot({ path: `${dir}/page-0.png` });
      }

      const menuItems = await page.$$("ul.ammenu-items.-root > li");
      const links = await Promise.all(
        menuItems.map(async (item) => {
          const anchor = await item.$("a");
          return anchor?.evaluate((el) => el.getAttribute("href"));
        })
      );

      for (const menuLink of links) {
        if (!menuLink) continue;

        let productsCurrentPage = 1;
        let hasMorePages = true;

        while (hasMorePages) {
          try {
            console.log(`Visitando: ${menuLink}?p=${productsCurrentPage}`);

            await page.goto(`${menuLink}?p=${productsCurrentPage}`, {
              waitUntil: "networkidle2",
              timeout: 300000,
            });

            if (process.env.NODE_ENV === "development") {
              await page.screenshot({
                path: `${dir}/page-${currentPage}.png`,
              });
            }

            const productsBlocks = await page.$$(".item.product.product-item");
            if (productsBlocks.length === 0) {
              hasMorePages = false;
              break;
            }

            for (const block of productsBlocks) {
              try {
                // Helper to get innerText
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

                // Helper to get href
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

                // Helper to get src
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

                const getTitle = async (
                  selector: string
                ): Promise<string | null> => {
                  const el = await block.$(selector);
                  if (!el) return null;
                  const title = await el.evaluate((e) =>
                    (e as HTMLElement).title.trim()
                  );
                  return title || null;
                };

                const getAttribute = async (
                  selector: string,
                  attribute: string
                ): Promise<string | null> => {
                  const el = await block.$(selector);
                  if (!el) return null;
                  const value = await el.evaluate((e) =>
                    e.getAttribute(attribute)
                  );
                  return value;
                };

                const name = await getText(".product.name.product-item-name a");
                const link = await getHref(".product.name.product-item-name a");
                const priceRaw = await getText(
                  ".price-final_price .price-wrapper .price"
                );
                const outOfStock = await getText(".unavailable");
                const image = await getSrc(".product-image-photo");
                const brand = await getTitle(".amshopby-option-link a");
                const sku =
                  (await block.$eval('form[data-role="tocart-form"]', (form) =>
                    form.getAttribute("data-product-sku")
                  )) || "unknown";

                if (name && link) {
                  allProducts.push({
                    name,
                    link,
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
                    outOfStock: !!outOfStock,
                    image: image || "",
                    brand: brand?.toUpperCase() || "UNKNOWN",
                    sku: sku?.toUpperCase() || "unknown",
                    baseProductSku: "",
                    webpage: this.webpage.url,
                  });
                }
              } catch (error) {
                console.error("Error processing product block:", error);
                continue;
              }
            }

            if (await this.isLastPage(page)) {
              hasMorePages = false;
            } else {
              productsCurrentPage++;
            }
            currentPage++;
          } catch (error: any) {
            await this.logPageScrapError(menuLink, error.message);
            if (error.message.includes("429")) {
              await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds on rate limit
            } else {
              hasMorePages = false;
            }
          }
        }
      }
      await page.close();
      await browser.close();
      return allProducts;
    } catch (error: any) {
      await this.logPageScrapError(this.webpage.url, error.message);
      if (error.message.includes("429")) {
        await delay(5);
      }
      return [];
    }
  }
}
