import { triggerScrape } from "../scraper";

export default async function handler(req: any, res: any) {
  try {
    const result = await triggerScrape();
    res.status(result.status).json(result);
  } catch (error: any) {
    console.error("Scrape endpoint error:", error);
    res.status(500).json({
      status: 500,
      message: error.message || "An unknown error occurred",
    });
  }
}
