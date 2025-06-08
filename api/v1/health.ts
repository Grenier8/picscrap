import prisma from '../../src/utils/prisma';

export default async function handler(req: any, res: any) {
  const startTime = Date.now();
  let dbStatus = 'unknown';
  let dbError = null;
  let dbVersion = null;

  // Test database connection
  try {
    const result = await prisma.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    dbVersion = result[0]?.version || 'unknown';
    dbStatus = 'connected';
  } catch (error: any) {
    console.error('Database connection error:', error);
    dbStatus = 'error';
    dbError = error.message || 'Unknown database error';
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError);
    }
  }

  const isHealthy = dbStatus === 'connected';
  const responseTime = Date.now() - startTime;

  const healthStatus = {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.VERCEL_GITHUB_COMMIT_SHA || 'local',
    responseTime: `${responseTime}ms`,
    database: {
      status: dbStatus,
      error: dbError,
      version: dbVersion,
    },
    checks: {
      database: dbStatus === 'connected',
    },
  };

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json(healthStatus);
}
