import { scrapAllPages, FilteringType } from "../scraping/scrap";
import { Logger } from "../utils/logger";

let isScrapingInProgress = false;
let scrapingPromise: Promise<void> | null = null;

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
  const startTime = Date.now();
  
  try {
    isScrapingInProgress = true;
    console.log('Starting scraping process...');
    
    await scrapAllPages(FilteringType.SIMILARITY);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Scraping completed successfully in ${duration}s`);
    await Logger.scrapEnd(duration);
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during scraping';
    console.error('Error during scraping:', error);
    
    try {
      await Logger.scrapingError(error);
    } catch (logError) {
      console.error('Failed to log scraping error:', logError);
    }
    
    throw new Error(`Scraping failed: ${errorMessage}`);
  } finally {
    isScrapingInProgress = false;
    scrapingPromise = null;
    console.log('Scraping process completed');
  }
}

export interface ScrapeTriggerResponse {
  result: string;
  status: number;
  message: string;
}

export async function triggerScrape(): Promise<ScrapeTriggerResponse> {
  try {
    if (scrapingPromise) {
      return {
        result: "error",
        status: 204,
        message: "Scraping already in progress",
      };
    }

    scrapingPromise = handleScraping();

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
  } finally {
    if (scrapingPromise && scrapingPromise.catch) {
      scrapingPromise.catch(() => {
        scrapingPromise = null;
      });
    }
  }
}
