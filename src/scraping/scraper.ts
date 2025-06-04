import puppeteer, { Browser, Page } from "puppeteer";
import {
  AssistantProduct,
  AssistantRequest,
  AssistantResponse,
  BaseProductDB,
  Brand,
  ProductScrap,
  Webpage,
} from "../interfaces";
import {
  saveAssistantProductsToFile,
  saveConversationToFile,
  saveCorrelationsToFile,
  saveProductsToFile,
} from "../utils/fileManager";
import { getScrapProductsJSON } from "../service/product";
import { getBestMatch } from "../utils/similarity/productSimilarity";
import OpenAiService from "../service/openAi";

export abstract class Scraper {
  webpage: Webpage;
  openAiService: OpenAiService;
  conversation: { role: "user" | "assistant"; content: string }[] = [];

  constructor(webpage: Webpage) {
    this.webpage = webpage;
    this.openAiService = new OpenAiService();
  }

  async getAllProducts(): Promise<ProductScrap[]> {
    console.log(`Started ${this.webpage.name} scraping`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await this.setUserAgent(page);
    const allProducts = await this.scrapeAllPages(browser, page);
    console.log("All products obtained: ", allProducts.length);

    saveProductsToFile(allProducts, this.webpage.id);
    await browser.close();
    console.log(`Ended ${this.webpage.name} scraping`);
    return allProducts;
  }

  async getProductsBySku(skus: string[]): Promise<ProductScrap[]> {
    console.log(`Started ${this.webpage.name} scraping`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await this.setUserAgent(page);
    const allProducts = await this.scrapeAllPages(browser, page);
    console.log("All products obtained: ", allProducts.length);

    const filteredProducts = allProducts.filter((product: ProductScrap) =>
      skus.includes(product.sku)
    );
    console.log("Filtered products: ", filteredProducts.length);

    saveProductsToFile(filteredProducts, this.webpage.id);
    await browser.close();
    console.log(`Ended ${this.webpage.name} scraping`);
    return filteredProducts;
  }

  async getProductsBySimilarity(
    baseProducts: BaseProductDB[]
  ): Promise<ProductScrap[]> {
    console.log(`Started ${this.webpage.name} scraping`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await this.setUserAgent(page);
    // const allProducts = await this.scrapeAllPages(browser, page);
    const allProducts = await getScrapProductsJSON(this.webpage);
    console.log("All products obtained: ", allProducts.length);
    saveProductsToFile(allProducts, this.webpage.id);

    let count = 0;
    const filteredProducts: ProductScrap[] = [];
    for (const baseProduct of baseProducts) {
      count++;
      console.log(`Processing product ${count}/${baseProducts.length}`);
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
    console.log(
      "Filtered products: ",
      allProducts.length,
      filteredProducts.length
    );

    await browser.close();
    console.log(`Ended ${this.webpage.name} scraping`);
    return filteredProducts;
  }

  async getProductsWithOpenAI(
    baseProducts: BaseProductDB[]
  ): Promise<ProductScrap[]> {
    console.log(`Started ${this.webpage.name} scraping`);
    // const browser = await puppeteer.launch({ headless: true });
    // const page = await browser.newPage();
    // await this.setUserAgent(page);
    const allProducts = await getScrapProductsJSON(this.webpage);
    console.log("All products obtained: ", allProducts.length);
    saveProductsToFile(allProducts, this.webpage.id);

    const filteredProducts: ProductScrap[] = [];
    const MAX_PRODUCTS = 100;

    // Asumimos una sola marca; puedes restaurar tu lógica original si hay varias
    const brands = [{ name: "SMALLRIG" } as Brand];

    for (const brand of brands) {
      const baseProductsByBrand = baseProducts.filter(
        (product) => product.Brand.name === brand.name
      );
      let secondaryProductsByBrand = allProducts.filter(
        (product) => product.brand === brand.name
      );
      console.log(
        "Products by brand: ",
        brand.name,
        baseProductsByBrand.length,
        secondaryProductsByBrand.length
      );

      // Nuevo: Por cada batch de base, recorre todos los secondary en batches
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
          saveAssistantProductsToFile(
            baseProductsRequest,
            secondaryProductsRequest,
            brand.name + "_" + count
          );

          const openAiRequest = {
            baseProducts: baseProductsRequest,
            secondaryProducts: secondaryProductsRequest,
          } as AssistantRequest;
          console.log("openAiRequest Base", openAiRequest.baseProducts.length);
          console.log(
            "openAiRequest Products",
            openAiRequest.secondaryProducts.length
          );

          // Store the outgoing user message
          this.conversation.push({
            role: "user",
            content: JSON.stringify(openAiRequest),
          });
          const response = await this.openAiService.callAssistant(
            JSON.stringify(openAiRequest)
          );
          console.log("openAiResponse", response);
          // Store the assistant's response
          this.conversation.push({ role: "assistant", content: response });
          const openAiResponse = JSON.parse(response) as AssistantResponse;
          console.log(
            "openAiResponse total",
            openAiResponse.correlation.length
          );
          console.log(
            "openAiResponse BaseFound",
            openAiResponse.correlation.filter((c) => c.secondarySKU).length
          );
          saveConversationToFile(this.conversation, `conversation_${count}`);

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

          saveCorrelationsToFile(openAiResponse, brand.name + "_" + count);
          count++;

          // (Índices avanzan automáticamente en los bucles for)
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
    console.log(
      `Filtered products: ${filteredProducts.length} of ${allProducts.length}`
    );

    // await browser.close();
    console.log(`Ended ${this.webpage.name} scraping`);
    return filteredProducts;
  }

  protected async setUserAgent(page: Page) {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );
  }

  protected abstract scrapeAllPages(
    browser: Browser,
    page: Page
  ): Promise<ProductScrap[]>;
}
