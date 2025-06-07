import { getWebpages } from "../api/webpages";
import { Webpage, ProductScrap, BaseProductDB, ProductDB } from "../interfaces";
import { upsertBaseProducts } from "../api/base-products";
import { deleteAndUpsertProducts, upsertProducts } from "../api/products";
import { getBaseProducts } from "../api/base-products";
// import { getBaseProducts } from "../service/product";
import { Scraper } from "./scraper";
import { PicslabScraper } from "./picslabScraper";
import { AperturaScraper } from "./aperturaScraper";
import { RincónFotográficoScraper } from "./rinconFotograficoScraper";
import { DavidAndJosephScraper } from "./davidandjosephScraper";
import { Logger } from "../utils/logger";

export enum FilteringType {
  SKU,
  SIMILARITY,
  OPENAI,
}

export interface ScrapResult {
  baseProductsScraped: number;
  productsFiltered: number;
  duration: string;
}

export async function scrapAllPages(
  filteringType: FilteringType
): Promise<ScrapResult> {
  const uuid = crypto.randomUUID();
  await Logger.scrapStart(uuid);
  const scrapStart = Date.now();

  const webpages = await getWebpages();
  Logger.log(`Webpages obtained: ${webpages.length}`);

  const scrapers: Scraper[] = [
    new DavidAndJosephScraper(
      webpages.find((w) => w.name === "David and Joseph")!
    ),
    new PicslabScraper(webpages.find((w) => w.name === "Picslab")!),
    new RincónFotográficoScraper(
      webpages.find((w) => w.name === "Rincón Fotográfico")!
    ),
    new AperturaScraper(webpages.find((w) => w.name === "Apertura")!),
  ];

  const baseScrapers = scrapers.filter((s) => s.webpage.isBasePage);
  const nonBaseScrapers = scrapers.filter((s) => !s.webpage.isBasePage);

  const allProducts: ProductScrap[] = [];
  const newBaseProducts: BaseProductDB[] = [];
  for (const scraper of baseScrapers) {
    const start = Date.now();
    Logger.webpageScrapStart(scraper.webpage.name);
    const products = await scraper.getAllProducts();
    const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(2);
    Logger.log(`Base scraper ${scraper.webpage.name} finished in ${elapsed}m`);
    // allProducts.push(...products);

    newBaseProducts.push(
      ...products.map(
        (product) =>
          ({ ...product, Brand: { name: product.brand } } as BaseProductDB)
      )
    );
  }

  await upsertBaseProducts(newBaseProducts);

  const baseProducts = await getBaseProducts();
  // const updatedBaseProducts: BaseProductDB[] = baseProducts.map(
  //   (bp) => ({ ...bp, Brand: { name: bp.brand } } as BaseProductDB)
  // );
  const updatedBaseProducts = baseProducts;
  for (const scraper of nonBaseScrapers) {
    const start = Date.now();

    Logger.webpageScrapStart(scraper.webpage.name);

    let products: ProductScrap[] = [];
    switch (filteringType) {
      case FilteringType.SKU:
        products = await scraper.getProductsBySku(updatedBaseProducts);
        break;
      case FilteringType.SIMILARITY:
        products = await scraper.getProductsBySimilarity(updatedBaseProducts);
        break;
      case FilteringType.OPENAI:
        products = await scraper.getProductsWithOpenAI(updatedBaseProducts);
        break;
    }
    const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(2);

    Logger.webpageScrapEnd(scraper.webpage.name, products.length, elapsed);
    Logger.log(`Scraper ${scraper.webpage.name} finished in ${elapsed}m`);

    allProducts.push(...products);
  }

  // await upsertProducts(
  //   allProducts.map(
  //     (product) =>
  //       ({
  //         ...product,
  //         Webpage: webpages.find((w) => w.url === product.webpage),
  //         Brand: { name: product.brand },
  //         BaseProduct: updatedBaseProducts.find(
  //           (bp) => bp.sku === product.baseProductSku
  //         ),
  //       } as ProductDB)
  //   )
  // );

  const scrapEnd = ((Date.now() - scrapStart) / 1000 / 60).toFixed(2);
  Logger.scrapEnd(scrapEnd + "m");
  return {
    baseProductsScraped: baseProducts.length,
    productsFiltered: allProducts.length,
    duration: scrapEnd + "m",
  };
}
