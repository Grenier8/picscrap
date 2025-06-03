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
  saveCorrelationsToFile,
  saveProductsToFile,
} from "../utils/fileManager";
import { getScrapProducts } from "../service/product";
import { getBestMatch } from "../utils/similarity/productSimilarity";
import OpenAiService from "../service/openAi";

export abstract class Scraper {
  webpage: Webpage;
  openAiService: OpenAiService;

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
    const allProducts = await getScrapProducts(this.webpage);
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
    const allProducts = await getScrapProducts(this.webpage);
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

      // Track which SKUs have been matched
      const matchedBaseSKUs = new Set<string>();
      const matchedSecondarySKUs = new Set<string>();

      let remainingBase = [...baseProductsByBrand];
      let remainingSecondary = [...secondaryProductsByBrand];

      while (remainingBase.length > 0 && remainingSecondary.length > 0) {
        // Take up to MAX_PRODUCTS, split equally if possible
        const baseBatchCount = Math.min(
          Math.floor(MAX_PRODUCTS / 2),
          remainingBase.length
        );
        const secondaryBatchCount = Math.min(
          MAX_PRODUCTS - baseBatchCount,
          remainingSecondary.length
        );

        const baseBatch = remainingBase.slice(0, baseBatchCount);
        const secondaryBatch = remainingSecondary.slice(0, secondaryBatchCount);

        const baseProductsRequest: AssistantProduct[] = baseBatch.map(
          (product) => ({
            sku: product.sku,
            name: product.name,
            image: product.image || "",
          })
        );
        const productsRequest: AssistantProduct[] = secondaryBatch.map(
          (product) => ({
            sku: product.sku,
            name: product.name,
            image: product.image || "",
          })
        );
        saveAssistantProductsToFile(
          baseProductsRequest,
          productsRequest,
          brand.name
        );

        const openAiRequest = {
          baseProducts: baseProductsRequest,
          secondaryProducts: productsRequest,
        } as AssistantRequest;
        console.log("openAiRequest", openAiRequest);

        const response = await this.openAiService.callAssistant(
          JSON.stringify(openAiRequest)
        );
        const openAiResponse = JSON.parse(response) as AssistantResponse;
        console.log("openAiResponse", openAiResponse);

        let matchesFound = false;
        for (const correlation of openAiResponse.correlation) {
          if (!correlation.secondarySKU) continue;
          const baseProduct = baseBatch.find(
            (product) => product.sku === correlation.baseSKU
          );
          const secondaryProduct = secondaryBatch.find(
            (product) => product.sku === correlation.secondarySKU
          );
          if (baseProduct && secondaryProduct) {
            const baseProductObj = baseProductsByBrand.find(
              (bp) => bp.sku === baseProduct.sku
            );
            const secondaryProductObj = secondaryProductsByBrand.find(
              (sp) => sp.sku === secondaryProduct.sku
            );
            if (baseProductObj && secondaryProductObj) {
              filteredProducts.push({
                ...secondaryProductObj,
                webpage: this.webpage.url,
                baseProductSku: baseProductObj.sku,
              });
              matchedBaseSKUs.add(baseProductObj.sku);
              matchedSecondarySKUs.add(secondaryProductObj.sku);
              matchesFound = true;
            }
          }
        }

        saveCorrelationsToFile(openAiResponse, brand.name);

        // Filter matched from future batches
        remainingBase = remainingBase.filter(
          (product) => !matchedBaseSKUs.has(product.sku)
        );
        remainingSecondary = remainingSecondary.filter(
          (product) => !matchedSecondarySKUs.has(product.sku)
        );

        // If no matches found, just advance the secondary window,
        // but since we always remove matched secondaries, just repeat
        if (!matchesFound) {
          // To avoid infinite loop, advance the window by removing first N secondary
          // (those that didn't match anything)
          remainingSecondary = remainingSecondary.slice(secondaryBatchCount);
        }
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
