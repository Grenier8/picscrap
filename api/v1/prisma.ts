import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: any, res: any) {
  try {
    const result = await prisma.log.create({
      data: {
        executionId: "test",
        type: "test",
        event: "test",
        webpage: "test",
        message: "test",
        duration: "test",
        url: "test",
        data: "test",
      },
    });
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
