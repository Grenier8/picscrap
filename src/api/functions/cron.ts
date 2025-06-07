import { triggerScrape } from "../scraper";

export default async function handler(req: any, res: any) {
  try {
    const result = await triggerScrape();
    res.status(200).json({
      status: "success",
      result,
    });
  } catch (error: any) {
    console.error("Cron job error:", error);
    res.status(500).json({
      status: "error",
      error: error.message || "An unknown error occurred",
    });
  }
}
