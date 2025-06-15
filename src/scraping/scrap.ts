import { getBaseProducts, upsertBaseProducts } from "../api/base-products";
import { fullUpsertProducts, upsertProducts } from "../api/products";
import { getWebpages } from "../api/webpages";
import { BaseProductDB, ProductDB, ProductScrap } from "../interfaces";
// import { getBaseProducts } from "../service/product";
import { Logger } from "../utils/logger";
import { AperturaScraper } from "./aperturaScraper";
import { DavidAndJosephScraper } from "./davidandjosephScraper";
import { EbestScraper } from "./ebestScraper";
import { HorizontalFotoScraper } from "./horizontalfotoScraper";
import { PicslabScraper } from "./picslabScraper";
import { RincónFotográficoScraper } from "./rinconFotograficoScraper";
import { Scraper } from "./scraper";

export enum EFilteringType {
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
  webpagesIds: number[],
  scrapType: EScrapType,
  filteringType: EFilteringType
): Promise<ScrapResult> {
  const uuid = crypto.randomUUID();
  const allWebpages = await getWebpages();
  console.log("allWebpages", webpagesIds);
  const webpages = allWebpages.filter((w) => webpagesIds.includes(w.id));
  Logger.log(`Webpages obtained: ${webpages.length}`);

  await Logger.scrapStart(
    uuid,
    webpages.map((w) => w.name),
    scrapType,
    filteringType
  );
  const scrapStart = Date.now();

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
        case "Horizontal Foto":
          return new HorizontalFotoScraper(w);
        case "Ebest":
          return new EbestScraper(w);
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

  await upsertBaseProducts(newBaseProducts);

  const baseProducts = await getBaseProducts();
  // const updatedBaseProducts: BaseProductDB[] = baseProducts.map(
  //   (bp) => ({ ...bp, Brand: { name: bp.brand } } as BaseProductDB)
  // );

  for (const scraper of nonBaseScrapers) {
    const start = Date.now();

    await Logger.webpageScrapStart(scraper.webpage.name);

    let products: ProductScrap[] = [];
    switch (filteringType) {
      case EFilteringType.SKU:
        products = await scraper.getProductsBySku(baseProducts);
        break;
      case EFilteringType.SIMILARITY:
        products = await scraper.getProductsBySimilarity(
          baseProducts,
          scrapType
        );
        break;
      case EFilteringType.OPENAI:
        products = await scraper.getProductsWithOpenAI(baseProducts, scrapType);
        break;
    }
    const elapsed = (Date.now() - start) / 1000 / 60;

    await Logger.webpageScrapEnd(
      scraper.webpage.name,
      products.length,
      elapsed
    );
    Logger.log(`Scraper ${scraper.webpage.name} finished in ${elapsed}m`);

    allProducts.push(...products);

    const productsToDB = products.map(
      (product) =>
        ({
          ...product,
          Webpage: webpages.find((w) => w.url === product.webpage),
          Brand: { name: product.brand },
          BaseProduct: baseProducts.find(
            (bp) => bp.sku === product.baseProductSku
          ),
        } as ProductDB)
    );
    if (scrapType === EScrapType.FULL) {
      await fullUpsertProducts(productsToDB);
    } else if (scrapType === EScrapType.LITE) {
      await upsertProducts(productsToDB);
    }
  }

  const scrapEnd = (Date.now() - scrapStart) / 1000 / 60;
  await Logger.scrapEnd(
    scrapEnd,
    webpages.map((w) => w.name),
    allProducts.length
  );
  return {
    baseProductsScraped: baseProducts.length,
    productsFiltered: allProducts.length,
    duration: scrapEnd + "m",
  };
}
