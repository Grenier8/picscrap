import { EScrapType, FilteringType, scrapAllPages } from "../scraping/scrap";
import { Logger } from "../utils/logger";

let isScrapingInProgress = false;

export interface ScrapingState {
  isScraping: boolean;
  startedAt?: Date;
}

export function getScrapingState(): ScrapingState {
  return {
    isScraping: isScrapingInProgress,
    startedAt: isScrapingInProgress ? new Date() : undefined,
  };
}

async function handleScraping(
  scrapType: EScrapType,
  webpagesIds: number[]
): Promise<void> {
  try {
    isScrapingInProgress = true;
    if (scrapType === EScrapType.LITE) {
      await scrapAllPages(FilteringType.SIMILARITY, scrapType, webpagesIds);
    } else if (scrapType === EScrapType.FULL) {
      await scrapAllPages(FilteringType.OPENAI, scrapType, webpagesIds);
    }
    isScrapingInProgress = false;
  } catch (error: any) {
    Logger.scrapingError(error.message);
    isScrapingInProgress = false;
    throw error;
  }
}

export interface ScrapeTriggerResponse {
  result: string;
  status: number;
  message: string;
}

export async function triggerScrape(
  webpagesIds: number[]
): Promise<ScrapeTriggerResponse> {
  try {
    if (isScrapingInProgress) {
      return {
        result: "error",
        status: 204,
        message: "Scraping already in progress",
      };
    }

    handleScraping(EScrapType.LITE, webpagesIds);

    return {
      result: "success",
      status: 200,
      message: "Scraping started successfully",
    };
  } catch (error: any) {
    Logger.scrapingError(error.message);
    return {
      result: "error",
      status: 500,
      message: "Failed to start scraping",
    };
  }
}

export async function triggerScrapeFull(
  webpagesIds: number[]
): Promise<ScrapeTriggerResponse> {
  try {
    if (isScrapingInProgress) {
      return {
        result: "error",
        status: 204,
        message: "Scraping already in progress",
      };
    }

    handleScraping(EScrapType.FULL, webpagesIds);

    return {
      result: "success",
      status: 200,
      message: "Scraping started successfully",
    };
  } catch (error: any) {
    Logger.scrapingError(error.message);
    return {
      result: "error",
      status: 500,
      message: "Failed to start scraping",
    };
  }
}
