import { FastifyInstance } from "fastify";
import { triggerScrape } from "../api/scraper";

export default async function (fastify: FastifyInstance) {
  fastify.get("/cron/scrape", async (request, reply) => {
    try {
      const result = await triggerScrape();
      return { status: "success", result };
    } catch (error: any) {
      console.error("Cron job failed:", error);
      return reply.status(500).send({ status: "error", error: error.message });
    }
  });
}
