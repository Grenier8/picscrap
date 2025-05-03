import * as DavidJoseph from "./scraping/davidandjoseph";
import * as Picslab from "./scraping/picslab";
import * as RinconFotografico from "./scraping/rinconfotografico";
import * as Searcher from "./scraping/searcher";

// Picslab.getProducts();
// DavidJoseph.getProducts()
// RinconFotografico.getProducts();

Searcher.findProductsBetweenPages(Picslab.webpage, RinconFotografico.webpage).then((result) => {
    console.log(result);
});
