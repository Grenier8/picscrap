import { createLog } from "../api/logs";

export class Logger {
  static executionId: string;

  static async init() {}

  static async scrapStart(executionId: string) {
    this.executionId = executionId;
    this.info("Scraping started");
    await createLog({
      executionId,
      type: "INFO",
      webpage: "-",
      event: "scrap-start",
      message: "Scraping started",
      data: "",
    });
  }

  static async scrapEnd(duration: string) {
    this.info(`Scraping ended in ${duration}s`);
    await createLog({
      executionId: this.executionId,
      type: "INFO",
      webpage: "-",
      event: "scrap-end",
      message: `Scraping ended in ${duration}s`,
      duration,
      data: "",
    });
  }

  static async webpageScrapStart(webpage: string) {
    this.info(`Scraping started for webpage: ${webpage}`);
    await createLog({
      executionId: this.executionId,
      type: "INFO",
      webpage,
      event: "webpage-scrap-start",
      message: `Scraping started for webpage: ${webpage}`,
      data: "",
    });
  }

  static async filterProductsResult(
    webpage: string,
    baseProducts: number,
    filteredProducts: number,
    filterType: string,
    duration: string
  ) {
    this.info(`Filtered products: ${duration}s`);
    await createLog({
      executionId: this.executionId,
      type: "INFO",
      webpage,
      event: "filter-products-result",
      message: `Filtered products: ${duration}s`,
      duration,
      data: JSON.stringify({ filterType, baseProducts, filteredProducts }),
    });
  }

  static async webpageScrapEnd(
    webpage: string,
    products: number,
    duration: string
  ) {
    this.info(`Scraping ended for webpage: ${webpage}`);
    await createLog({
      executionId: this.executionId,
      type: "INFO",
      webpage,
      event: "webpage-scrap-end",
      message: `Scraping ended for webpage: ${webpage}`,
      duration,
      data: JSON.stringify({ products }),
    });
  }

  static async pageScrapError(webpage: string, url: string, error: string) {
    this.error(`Scraping error for webpage: ${webpage}`);
    await createLog({
      executionId: this.executionId,
      type: "ERROR",
      webpage,
      event: "page-scrap-error",
      message: `Scraping error for webpage: ${webpage}`,
      url,
      data: error,
    });
  }

  static async productScrapError(webpage: string, url: string, error: string) {
    this.error(`Scraping error for webpage: ${webpage}`);
    await createLog({
      executionId: this.executionId,
      type: "ERROR",
      webpage,
      event: "product-scrap-error",
      message: `Scraping error for webpage: ${webpage}`,
      url,
      data: error,
    });
  }

  static async openAiError(webpage: string, url: string, error: string) {
    this.error(`Scraping error for webpage: ${webpage}`);
    await createLog({
      executionId: this.executionId,
      type: "ERROR",
      webpage,
      event: "open-ai-error",
      message: `Scraping error for webpage: ${webpage}`,
      url,
      data: error,
    });
  }

  static async receivedScrapRequest() {
    this.info(`Received scrap request`);
    await createLog({
      executionId: this.executionId,
      type: "INFO",
      webpage: "-",
      event: "received-scrap-request",
      message: `Received scrap request`,
      data: "",
    });
  }

  static async resolvedScrapRequest(duration: string) {
    this.info(`Resolved scrap request`);
    await createLog({
      executionId: this.executionId,
      type: "INFO",
      webpage: "-",
      event: "resolved-scrap-request",
      message: `Resolved scrap request`,
      duration,
      data: "",
    });
  }

  static async scrapingError(error: string) {
    this.error(`Scraping error`);
    await createLog({
      executionId: this.executionId,
      type: "ERROR",
      webpage: "-",
      event: "scraping-error",
      message: `Scraping error`,
      data: error,
    });
  }

  static log(message: string) {
    console.log(message);
  }

  static error(message: string) {
    console.error(message);
  }

  static info(message: string) {
    console.info(message);
  }

  static warn(message: string) {
    console.warn(message);
  }

  static debug(message: string) {
    console.debug(message);
  }
}
