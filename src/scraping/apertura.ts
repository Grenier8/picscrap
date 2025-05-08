import puppeteer from 'puppeteer-extra';
import fs from 'fs';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page, Product } from '../interfaces';
import delay from '../utils/delay';
import { saveProductsToFile } from '../utils/fileManager';
import { createLimiter } from '../utils/limiter';

puppeteer.use(StealthPlugin());

export const webpage: Page = {
    name: 'Apertura',
    id: 'apertura',
    url: 'https://apertura.cl/tienda/',
    dbPort: 3003
}

let pagesList: [
    "180-canon",
    "181-nikon",
    "182-canon",
    "184-fujifilm",
    "371-sony-mirrorless",
    "185-panasonic",
    "186-canon",
    "187-fujifilm",
    "439-sony-lente-fijo",
    "338-instantaneas",
    "339-compactas",
    "340-profesionales",
    "341-cinema",
    "342-de-accion-y-espectaculos",
    "383-ptz-robotizadas",
    "21-gopro-y-camaras-deportivas",
    "166-drones",
    "349-webcams",
    "431-vr-y-360",
    "434-formato-medio",
    "70-montura-canon-reflex-ef-ef-s",
    "71-lentes-para-nikon",
    "158-lentes-para-sony-e-e-mount",
    "164-lentes-para-fujifilm",
    "123-lentes-para-panasonic-lumix",
    "189-montura-micro-cuatro-tercios",
    "73-adaptadores",
    "191-polarizadores",
    "192-uv",

]

const searchProduct = async (search: string) => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');

    await page.goto(`https://davidandjoseph.cl/index.php?route=product/search&search=&description=true`);

    await page.screenshot({ path: '1.png' });

    await page.type('input[name="search"]', search);

    await page.screenshot({ path: '2.png' });
    await page.click('button[class="search-button"]');

    // await page.waitForSelector('h1[class="title page-title"]', {});

    // await page.waitForSelector('img', { visible: true });

    await page.screenshot({ path: '3.png' });

    const data = await page.evaluate(() => {
        const images = document.querySelectorAll('img');
        const urls = Array.from(images).map((img) => img.src);
        return urls;
    });

    await browser.close();
    console.log(data);
    return data;


}

export const getProducts = async () => {
    const allProducts: Product[] = [];
    let currentPage = 1;

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');

    await page.goto(webpage.url, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: `scans/${webpage.id}/page-0.png` });

    const links = await page.$$eval('#top-menu a', anchors =>
        anchors.map(a => (a.href))
    );

    for (const menuLink of links) {
        console.log(`Visitando: ${menuLink}`);

        try {
            await page.goto(`${menuLink}?resultsPerPage=120`, { waitUntil: 'networkidle2' });

            await page.screenshot({ path: `scans/${webpage.id}/page-${currentPage}.png` });

            const productsFather = await page.$("#js-product-list");
            if (productsFather) {
                const products = await page.$$('article.product-miniature');

                const limit = createLimiter(5);

                const items: Product[] = await Promise.all(
                    products.map(async product => limit(async () => {
                        const name = await product.$eval('h3.product-title a', el => el.textContent?.trim() || null).catch(() => null);
                        const link = await product.$eval('h3.product-title a', el => (el as HTMLAnchorElement).href).catch(() => null);
                        const price = await product.$eval('span.price', el => el.textContent?.trim().replace(/\n/g, '') || null).catch(() => null);
                        const outOfStock = await product.evaluate(el => el.classList.contains('out-of-stock')).catch(() => null);
                        const image = await product.$eval('meta[itemprop="image"]', el => el.getAttribute('content')).catch(() => null);
                        const brand = await product.$eval('div[itemprop="brand"] meta[itemprop="name"]', el => el.getAttribute('content')).catch(() => null);

                        let sku = null

                        if (link) {
                            const productPage = await browser.newPage();
                            try {
                                await productPage.goto(link, { waitUntil: 'networkidle2' });
                                sku = await productPage.$eval('section#main meta[itemprop="sku"]', el => el.getAttribute('content')).catch(() => null);


                            } catch (error) {
                                console.error(`❌ Error en ${link}:`, error);
                            } finally {
                                await productPage.close();
                            }

                        }

                        return {
                            name,
                            link,
                            price,
                            outOfStock,
                            image,
                            brand,
                            sku,
                        } as Product;
                    })
                    )
                );

                console.log(items.length)
                allProducts.push(...items);
            }

            currentPage++;
            await delay(2);
        } catch (error: any) {
            if (error.message.includes('429')) {
                console.log('HTTP 429 encountered. Retrying with backoff...');
                await delay(5 * currentPage);
                continue;
            } else {
                console.error(`Error navigating to ${menuLink}:`, error);
                break;
            }
        }
    };

    saveProductsToFile(allProducts, webpage.id);

    await browser.close();
};