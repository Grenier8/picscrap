import { triggerScrape, getScrapingState } from "../../src/api/scraper";

// Helper function to format error response
function formatErrorResponse(error: any, statusCode: number = 500) {
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  const errorStack = process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined;
  
  return {
    status: 'error',
    code: statusCode,
    message: errorMessage,
    ...(errorStack && { stack: errorStack }),
    timestamp: new Date().toISOString()
  };
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: 'error',
      code: 405,
      message: 'Method not allowed. Use POST to trigger scraping.'
    });
  }

  try {
    console.log('Received scrape request');
    
    // Check if scraping is already in progress
    const scrapingState = getScrapingState();
    if (scrapingState.isScraping) {
      return res.status(202).json({
        status: 'processing',
        message: 'Scraping is already in progress',
        startedAt: scrapingState.startedAt?.toISOString()
      });
    }

    // Trigger the scraping process
    const result = await triggerScrape();
    
    // Return the result
    res.status(200).json({
      status: 'success',
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Scrape endpoint error:', error);
    
    // Handle different types of errors
    if (error.message?.includes('already in progress')) {
      return res.status(202).json({
        status: 'processing',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    // For other errors, return 500
    res.status(500).json(formatErrorResponse(error));
  }
}
