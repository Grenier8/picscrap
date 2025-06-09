import { FilteringType, scrapAllPages } from "./scraping/scrap";
import { loadBaseProducts } from "./scraping/base";
import {
  getStringSimilarity,
  getStringSimilarityJaroWinkler,
  getStringSimilarityDiceCoefficient,
} from "./utils/similarity/stringSimilarity";
import { getImageSimilarity } from "./utils/similarity/imageSimilarity";
import { getBaseProducts, getBaseProductsByBrand } from "./api/base-products";
import {
  saveAssistantProductsToFile,
  saveProductsToFile,
} from "./utils/fileManager";
import { AssistantProduct, BaseProductScrap } from "./interfaces";
import { getWebpages } from "./api/webpages";
import { getBrands } from "./api/brands";
import { getProductsByWebpageAndBrand } from "./api/products";
import { triggerScrape, ScrapeTriggerResponse } from "./api/scraper";
import fastify from "fastify";
import { FastifyReply, FastifyRequest } from "fastify";

const app = fastify({ logger: true });

// // Enable CORS
app.register(require("@fastify/cors"), {
  origin: true, // or specify your allowed origins
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// // Add API endpoints
app.post<{ Reply: ScrapeTriggerResponse }>(
  "/api/scrape",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await triggerScrape();
      reply.code(result.status).send(result);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      reply.code(500).send({
        status: "error",
        error: errorMessage,
      });
    }
  }
);

app.get<{ Reply: any }>(
  "/api/health",
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      reply.code(200).send({
        status: "healthy",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        version: process.env.VERCEL_GITHUB_COMMIT_SHA || "local",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      reply.code(500).send({
        status: "error",
        error: errorMessage,
      });
    }
  }
);

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3010", 10);
    const host = "0.0.0.0"; // Important for Render

    await app.listen({
      port,
      host,
    });

    app.log.info(`Server listening on port ${port}`);
  } catch (err: unknown) {
    app.log.error(
      err instanceof Error ? err.message : "An unknown error occurred"
    );
    process.exit(1);
  }
};

start();

// console.log(
//   "SS Dice: ",
//   getStringSimilarityDiceCoefficient(
//     "Grabadora Portátil Zoom H4essential - 32 Bit Flotante",
//     "Zoom H4essential 4-Track 32-Bit Float Audio Recorder"
//   )
// );
// console.log(
//   "SS JaroWinkler: ",
//   getStringSimilarityJaroWinkler(
//     "Grabadora Portátil Zoom H4essential - 32 Bit Flotante",
//     "Zoom H4essential 4-Track 32-Bit Float Audio Recorder"
//   )
// );
// console.log(
//   "SS: ",
//   getStringSimilarity(
//     "Grabadora Portátil Zoom H4essential - 32 Bit Flotante",
//     "Zoom H4essential 4-Track 32-Bit Float Audio Recorder"
//   )
// );

// (async () => {
//   console.log(
//     "Image similarity: ",
//     await getImageSimilarity(
//       "https://davidandjoseph.cl/image/cache/catalog/Zoom/ZH1N-250x250.jpg",
//       "https://cdnx.jumpseller.com/picslab-store/image/46169653/resize/306/306?1709674031"
//     )
//   );
// })();

// scrapAllPages(FilteringType.SIMILARITY);

// loadBaseProducts();

// Searcher.findProductsBetweenPages(Picslab.webpage, Apertura.webpage).then((result) => {
//     console.log(result);
// });

// (async () => {
//   const baseProducts = await getBaseProducts();
//   const baseProductsScrap: BaseProductScrap[] = baseProducts.map((product) => ({
//     name: product.name,
//     link: product.link || "",
//     price: product.price,
//     outOfStock: null,
//     image: product.image || "",
//     brand: product.Brand.name,
//     sku: product.sku,
//   }));
//   saveProductsToFile(baseProductsScrap, 0);
// })();

// (async () => {
//   const webpage = await getWebpages().then(
//     (webpages) => webpages.find((w) => w.name === "David and Joseph")!
//   );
//   const brands = await getBrands();
//   const brand = brands.find((b) => b.name === "SMALLRIG");
//   if (!brand) {
//     throw new Error("Brand not found");
//   }
//   const baseProducts = await getBaseProductsByBrand(brand);
//   const products = await getProductsByWebpageAndBrand(webpage, brand);
//   const baseProductsScrap: AssistantProduct[] = baseProducts.map((product) => ({
//     sku: product.sku,
//     name: product.name,
//     image: product.image || "",
//   }));
//   const productsScrap: AssistantProduct[] = products.map((product) => ({
//     sku: product.sku,
//     name: product.name,
//     image: product.image || "",
//   }));
//   saveAssistantProductsToFile(baseProductsScrap, productsScrap, brand.name);
// })();
