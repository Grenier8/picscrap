import { Log } from "../interfaces";
import { Logger } from "../utils/logger";
import prisma from "../utils/prisma";

export async function createLog(log: Log) {
  try {
    await prisma.log.create({
      data: {
        executionId: log.executionId,
        type: log.type,
        event: log.event,
        webpage: log.webpage,
        message: log.message,
        duration: log.duration || 0,
        url: log.url || "",
        data: log.data || "",
      },
    });
  } catch (error: any) {
    await Logger.databaseError(error);
  }
}
