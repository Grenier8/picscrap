import puppeteer, { Browser, Page } from "puppeteer";
import { getBrands } from "../api/brands";
import {
  AssistantProduct,
  AssistantRequest,
  AssistantResponse,
  BaseProductDB,
  ProductScrap,
  Webpage,
} from "../interfaces";
import OpenAiService from "../service/openAi";
import { saveProductsToFile } from "../utils/fileManager";
import { Logger } from "../utils/logger";
import { getBestMatch } from "../utils/similarity/productSimilarity";

export abstract class Scraper {
  webpage: Webpage;
  openAiService: OpenAiService;
  conversation: { role: "user" | "assistant"; content: string }[] = [];

  constructor(webpage: Webpage) {
    this.webpage = webpage;
    this.openAiService = new OpenAiService();
  }

  async createBrowser(): Promise<Browser> {
    return await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      executablePath: process.env.CHROME_PATH || "",
      args: ["--no-sandbox"],
    });
  }

  async getAllProducts(): Promise<ProductScrap[]> {
    const allProducts = await this.scrapeAllPages();

    if (process.env.NODE_ENV === "development") {
      saveProductsToFile(allProducts, this.webpage.id);
    }

    return allProducts;
  }

  async getProductsBySku(
    baseProducts: BaseProductDB[]
  ): Promise<ProductScrap[]> {
    const allProducts = await this.scrapeAllPages();
    const filteredProducts = allProducts.filter((product: ProductScrap) =>
      baseProducts.map((bp) => bp.sku).includes(product.sku)
    );
    Logger.filterProductsResult(
      this.webpage.name,
      allProducts.length,
      filteredProducts.length,
      "filter-by-sku",
      "0"
    );

    if (process.env.NODE_ENV === "development") {
      saveProductsToFile(filteredProducts, this.webpage.id);
    }
    return filteredProducts;
  }

  async getProductsBySimilarity(
    baseProducts: BaseProductDB[]
  ): Promise<ProductScrap[]> {
    const allProducts = await this.scrapeAllPages();

    if (process.env.NODE_ENV === "development") {
      saveProductsToFile(allProducts, this.webpage.id);
    }

    const start = Date.now();

    let count = 0;
    const filteredProducts: ProductScrap[] = [];
    for (const baseProduct of baseProducts) {
      count++;
      const bestMatch = await getBestMatch(baseProduct, allProducts, {
        imageWeight: baseProduct.image ? 0.3 : 0,
      });
      if (bestMatch) {
        filteredProducts.push({
          ...bestMatch,
          webpage: this.webpage.url,
          baseProductSku: baseProduct.sku,
        });
      }
    }

    Logger.filterProductsResult(
      this.webpage.name,
      allProducts.length,
      filteredProducts.length,
      "filter-by-similarity",
      ((Date.now() - start) / 1000 / 60).toFixed(2) + "m"
    );

    if (process.env.NODE_ENV === "development") {
      saveProductsToFile(filteredProducts, this.webpage.id);
    }
    return filteredProducts;
  }

  async getProductsWithOpenAI(
    baseProducts: BaseProductDB[]
  ): Promise<ProductScrap[]> {
    const allProducts = await this.scrapeAllPages();

    if (process.env.NODE_ENV === "development") {
      saveProductsToFile(allProducts, this.webpage.id);
    }

    const start = Date.now();
    const filteredProducts: ProductScrap[] = [];
    const MAX_PRODUCTS = 100;

    const brands = await getBrands();

    for (const brand of brands) {
      const baseProductsByBrand = baseProducts.filter(
        (product) => product.Brand.name === brand.name
      );
      let secondaryProductsByBrand = allProducts.filter(
        (product) => product.brand === brand.name
      );

      let count = 1;
      const BASE_BATCH_SIZE = Math.floor(MAX_PRODUCTS / 2);
      const SECONDARY_BATCH_SIZE = MAX_PRODUCTS - BASE_BATCH_SIZE;
      for (
        let baseIndex = 0;
        baseIndex < baseProductsByBrand.length;
        baseIndex += BASE_BATCH_SIZE
      ) {
        const baseBatch = baseProductsByBrand.slice(
          baseIndex,
          baseIndex + BASE_BATCH_SIZE
        );

        const baseProductsRequest: AssistantProduct[] = baseBatch.map(
          (product) => ({
            sku: product.sku,
            name: product.name,
            image: product.image || "",
            bestMatch: null,
          })
        );
        for (
          let secondaryIndex = 0;
          secondaryIndex < secondaryProductsByBrand.length;
          secondaryIndex += SECONDARY_BATCH_SIZE
        ) {
          const secondaryBatch = secondaryProductsByBrand.slice(
            secondaryIndex,
            secondaryIndex + SECONDARY_BATCH_SIZE
          );

          const secondaryProductsRequest: AssistantProduct[] =
            secondaryBatch.map((product) => ({
              sku: product.sku,
              name: product.name,
              image: product.image || "",
            }));

          const openAiRequest = {
            baseProducts: baseProductsRequest,
            secondaryProducts: secondaryProductsRequest,
          } as AssistantRequest;

          this.conversation.push({
            role: "user",
            content: JSON.stringify(openAiRequest),
          });
          const response = await this.openAiService.callAssistant(
            JSON.stringify(openAiRequest)
          );
          this.conversation.push({ role: "assistant", content: response });

          if (!response) {
            console.error("Error getting response from OpenAI");
            continue;
          }
          const openAiResponse = JSON.parse(response) as AssistantResponse;

          openAiResponse.correlation
            .filter((c) => c.secondarySKU)
            .forEach((c) => {
              const baseProduct = baseProductsRequest.find(
                (product) => product.sku === c.baseSKU
              );
              if (
                !baseProduct?.bestMatch ||
                baseProduct.bestMatch.sku !== c.secondarySKU
              ) {
                const secondaryProduct = secondaryProductsRequest.find(
                  (product) => product.sku === c.secondarySKU
                );
                if (baseProduct) {
                  baseProduct.bestMatch = {
                    sku: c.secondarySKU,
                    name: secondaryProduct?.name || "",
                    image: secondaryProduct?.image || "",
                  };
                }
              }
            });

          for (const correlation of openAiResponse.correlation) {
            if (!correlation.secondarySKU) continue;
            const baseProduct = baseBatch.find(
              (product) => product.sku === correlation.baseSKU
            );
            const secondaryProduct = secondaryBatch.find(
              (product) => product.sku === correlation.secondarySKU
            );
            if (baseProduct && secondaryProduct) {
              filteredProducts.push({
                ...secondaryProduct,
                webpage: this.webpage.url,
                baseProductSku: baseProduct.sku,
              });
            }
          }

          count++;
        }
        baseProductsRequest.forEach((product) => {
          if (product.bestMatch) {
            const secondaryProduct = allProducts.find(
              (secondaryProduct) =>
                secondaryProduct.sku === product.bestMatch?.sku
            );
            if (secondaryProduct) {
              filteredProducts.push({
                ...secondaryProduct,
                webpage: this.webpage.url,
                baseProductSku: product.sku,
              });
            }
          }
        });
      }
    }
    // console.log(
    //   "Repeated products: ",
    //   filteredProducts.filter(
    //     (p, i) =>
    //       filteredProducts.findIndex(
    //         (p2) =>
    //           p2.webpage === p.webpage && p2.baseProductSku === p.baseProductSku
    //       ) !== i
    //   ).length
    // );
    Logger.filterProductsResult(
      this.webpage.name,
      allProducts.length,
      filteredProducts.length,
      "filter-by-openai",
      ((Date.now() - start) / 1000 / 60).toFixed(2) + "m"
    );
    return filteredProducts;
  }

  protected async setUserAgent(page: Page) {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );
  }

  protected async logPageScrapError(url: string, error: string) {
    Logger.pageScrapError(this.webpage.name, url, error);
  }

  protected async logProductScrapError(url: string, error: string) {
    Logger.productScrapError(this.webpage.name, url, error);
  }

  protected async logInfo(message: string) {
    Logger.info(message);
  }

  abstract scrapeAllPages(): Promise<ProductScrap[]>;
}
