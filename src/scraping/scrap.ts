import { getBaseProducts } from "../api/base-products";
import {
  fullUpsertProducts,
  getProductsByWebpage,
  upsertProducts,
} from "../api/products";
import { getWebpages } from "../api/webpages";
import { BaseProductDB, ProductDB, ProductScrap } from "../interfaces";
// import { getBaseProducts } from "../service/product";
import { Logger } from "../utils/logger";
import { AperturaScraper } from "./aperturaScraper";
import { DavidAndJosephScraper } from "./davidandjosephScraper";
import { PicslabScraper } from "./picslabScraper";
import { RincónFotográficoScraper } from "./rinconFotograficoScraper";
import { Scraper } from "./scraper";

export enum FilteringType {
  SKU = "SKU",
  SIMILARITY = "SIMILARITY",
  OPENAI = "OPENAI",
}

export enum EScrapType {
  FULL = "FULL",
  LITE = "LITE",
}

export interface ScrapResult {
  baseProductsScraped: number;
  productsFiltered: number;
  duration: string;
}

export async function scrapAllPages(
  filteringType: FilteringType,
  scrapType: EScrapType,
  webpagesIds: number[]
): Promise<ScrapResult> {
  const uuid = crypto.randomUUID();
  await Logger.scrapStart(uuid, scrapType, filteringType);
  const scrapStart = Date.now();

  const allWebpages = await getWebpages();
  const webpages = allWebpages.filter((w) => webpagesIds.includes(w.id));
  Logger.log(`Webpages obtained: ${webpages.length}`);

  const scrapers: Scraper[] = webpages
    .map((w) => {
      switch (w.name) {
        case "David and Joseph":
          return new DavidAndJosephScraper(w);
        case "Picslab":
          return new PicslabScraper(w);
        case "Rincón Fotográfico":
          return new RincónFotográficoScraper(w);
        case "Apertura":
          return new AperturaScraper(w);
        default:
          return null;
      }
    })
    .filter((s) => s !== null) as Scraper[];

  const baseScrapers = scrapers.filter((s) => s.webpage.isBasePage);
  const nonBaseScrapers = scrapers.filter((s) => !s.webpage.isBasePage);

  const allProducts: ProductScrap[] = [];
  const newBaseProducts: BaseProductDB[] = [];
  for (const scraper of baseScrapers) {
    const start = Date.now();
    await Logger.webpageScrapStart(scraper.webpage.name);
    const products = await scraper.getAllProducts();
    const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(2);
    Logger.log(`Base scraper ${scraper.webpage.name} finished in ${elapsed}m`);

    newBaseProducts.push(
      ...products.map(
        (product) =>
          ({ ...product, Brand: { name: product.brand } } as BaseProductDB)
      )
    );
  }

  // await upsertBaseProducts(newBaseProducts);

  const baseProducts = await getBaseProducts();
  // const updatedBaseProducts: BaseProductDB[] = baseProducts.map(
  //   (bp) => ({ ...bp, Brand: { name: bp.brand } } as BaseProductDB)
  // );

  let updatedBaseProducts: BaseProductDB[] = [];
  for (const scraper of nonBaseScrapers) {
    const start = Date.now();

    await Logger.webpageScrapStart(scraper.webpage.name);

    const webpageProducts = await getProductsByWebpage(scraper.webpage);

    if (scrapType === EScrapType.FULL) {
      updatedBaseProducts = baseProducts;
    } else {
      updatedBaseProducts = baseProducts.filter(
        (bp) => !webpageProducts.some((wp) => wp.BaseProduct?.sku === bp.sku)
      );
    }

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

    await Logger.webpageScrapEnd(
      scraper.webpage.name,
      products.length,
      elapsed
    );
    Logger.log(`Scraper ${scraper.webpage.name} finished in ${elapsed}m`);

    allProducts.push(...products);
  }

  const productsToDB = allProducts.map(
    (product) =>
      ({
        ...product,
        Webpage: webpages.find((w) => w.url === product.webpage),
        Brand: { name: product.brand },
        BaseProduct: updatedBaseProducts.find(
          (bp) => bp.sku === product.baseProductSku
        ),
      } as ProductDB)
  );
  if (scrapType === EScrapType.FULL) {
    await fullUpsertProducts(productsToDB);
  } else {
    await upsertProducts(productsToDB);
  }

  const scrapEnd = ((Date.now() - scrapStart) / 1000 / 60).toFixed(2);
  await Logger.scrapEnd(scrapEnd + "m");
  return {
    baseProductsScraped: baseProducts.length,
    productsFiltered: allProducts.length,
    duration: scrapEnd + "m",
  };
}
