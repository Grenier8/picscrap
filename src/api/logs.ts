import prisma from "../utils/prisma";
import { Log } from "../interfaces";

export async function createLog(log: Log) {
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
}
