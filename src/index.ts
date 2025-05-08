import * as DavidJoseph from "./scraping/davidandjoseph";
import * as Picslab from "./scraping/picslab";
import * as RinconFotografico from "./scraping/rinconfotografico";
import * as Searcher from "./scraping/searcher";
import * as Apertura from "./scraping/apertura";

// Picslab.getProducts();
// DavidJoseph.getProducts()
// RinconFotografico.getProducts();
Apertura.getProducts();

// Searcher.findProductsBetweenPages(Picslab.webpage, RinconFotografico.webpage).then((result) => {
//     console.log(result);
// });
