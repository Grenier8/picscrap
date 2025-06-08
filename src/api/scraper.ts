import { scrapAllPages, FilteringType } from "../scraping/scrap";
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

async function handleScraping(): Promise<void> {
  try {
    isScrapingInProgress = true;
    await scrapAllPages(FilteringType.SIMILARITY);
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

export async function triggerScrape(): Promise<ScrapeTriggerResponse> {
  try {
    if (isScrapingInProgress) {
      return {
        result: "error",
        status: 204,
        message: "Scraping already in progress",
      };
    }

    await handleScraping();

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
