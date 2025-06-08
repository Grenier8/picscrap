import prisma from "../utils/prisma";
import { Log } from "../interfaces";

export async function createLog(log: Log) {
  try {
    await prisma.$connect();
    
    await prisma.log.create({
      data: {
        executionId: log.executionId,
        type: log.type,
        event: log.event,
        webpage: log.webpage,
        message: log.message,
        duration: log.duration || "",
        url: log.url || "",
        data: log.data || "",
      },
    });
  } catch (error) {
    console.error("Error creating log:", error);
    throw error;
  } finally {
    await prisma.$disconnect().catch(error => {
      console.error("Error disconnecting from Prisma:", error);
    });
  }
}
