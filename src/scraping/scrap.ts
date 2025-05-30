import { getWebpages } from "../api/webpages";
import { Webpage, ProductScrap, BaseProductDB, ProductDB } from "../interfaces";
import { upsertBaseProducts } from "../api/base-products";
import { upsertProducts } from "../api/products";
import { getBaseProducts } from "../api/base-products";
import { Scraper } from "./scraper";
import { PicslabScraper } from "./picslabScraper";
import { AperturaScraper } from "./aperturaScraper";
import { RincónFotográficoScraper } from "./rinconFotograficoScraper";
import { DavidAndJosephScraper } from "./davidandjosephScraper";

export async function scrapAllPages() {
  console.log("Started scraping");

  const webpages = await getWebpages();
  console.log("Webpages obtained: ", webpages.length);

  const scrapers: Scraper[] = [
    new DavidAndJosephScraper(
      webpages.find((w) => w.name === "David and Joseph")!
    ),
    // new PicslabScraper(webpages.find((w) => w.name === "Picslab")!),
    // new RincónFotográficoScraper(
    //   webpages.find((w) => w.name === "Rincón Fotográfico")!
    // ),
    // new AperturaScraper(webpages.find((w) => w.name === "Apertura")!),
  ];

  const baseScrapers = scrapers.filter((s) => s.webpage.isBasePage);
  const nonBaseScrapers = scrapers.filter((s) => !s.webpage.isBasePage);

  const allProducts: ProductScrap[] = [];
  const newBaseProducts: BaseProductDB[] = [];
  for (const scraper of baseScrapers) {
    const start = Date.now();
    const products = await scraper.getAllProducts();
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`Base scraper ${scraper.webpage.name} finished in ${elapsed}s`);
    // allProducts.push(...products);

    newBaseProducts.push(
      ...products.map(
        (product) =>
          ({ ...product, Brand: { name: product.brand } } as BaseProductDB)
      )
    );
  }

  await upsertBaseProducts(newBaseProducts);

  const updatedBaseProducts: BaseProductDB[] = await getBaseProducts();
  for (const scraper of nonBaseScrapers) {
    const start = Date.now();
    const products = await scraper.getProductsBySimilarity(updatedBaseProducts);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`Scraper ${scraper.webpage.name} finished in ${elapsed}s`);
    allProducts.push(...products);
  }

  await upsertProducts(
    allProducts.map(
      (product) =>
        ({
          ...product,
          Webpage: webpages.find((w) => w.url === product.webpage),
          Brand: { name: product.brand },
          BaseProduct: updatedBaseProducts.find(
            (bp) => bp.sku === product.baseProductSku
          ),
        } as ProductDB)
    )
  );

  console.log("Ended scraping");
}
