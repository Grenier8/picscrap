export default async function handler(req: any, res: any) {
  try {
    // You can add more health checks here, like database connection, etc.
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.VERCEL_GITHUB_COMMIT_SHA || "local",
    };

    res.status(200).json(healthStatus);
  } catch (error: any) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      error: error.message || "Health check failed",
    });
  }
}
