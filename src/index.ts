import * as DavidJoseph from "./scraping/davidandjoseph";
import * as Picslab from "./scraping/picslab";
import * as RinconFotografico from "./scraping/rinconfotografico";
import * as Searcher from "./scraping/searcher";
import * as Apertura from "./scraping/apertura";
import { csvToJson } from "./utils/csvUtils";
import { saveProductsToFile } from "./utils/fileManager";

// Picslab.getProducts();
// DavidJoseph.getProducts()
// RinconFotografico.getProducts();
// Apertura.getProducts();

// Searcher.findProductsBetweenPages(Picslab.webpage, Apertura.webpage).then((result) => {
//     console.log(result);
// });

csvToJson("./csv/picslab-products.csv").then((products) => {
  saveProductsToFile(products, "base");
});
