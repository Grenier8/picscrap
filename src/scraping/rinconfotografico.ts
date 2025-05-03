import puppeteer from 'puppeteer-extra';
import fs from 'fs';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Page, Product } from '../interfaces';
import delay from '../utils/delay';
import { saveProductsToFile } from '../utils/fileManager';

puppeteer.use(StealthPlugin());

export const webpage: Page = {
    name: 'Rincon Fotografico',
    id: 'rinconfotografico',
    url: 'https://rinconfotografico.cl',
    dbPort: 3002
}

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
    const baseUrl = 'https://rinconfotografico.cl/search?q=&page=';
    let currentPage = 1;
    const allProducts: Product[] = [];

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36');

    while (true) {
        const url = `${baseUrl}${currentPage}`;
        console.log(`Navigating to ${url}`);

        try {
            await page.goto(url, { waitUntil: 'networkidle2' });

            await page.screenshot({ path: `scans/${webpage.id}/page-${currentPage}.png` });

            const products = await page.evaluate(() => {
                const items: Product[] = [];
                const productBlocks = document.querySelectorAll('.product-block');

                productBlocks.forEach(block => {
                    //     const name = node.querySelector('.product-block__name')?.innerText.trim() || '';
                    //     const link = node.querySelector('.product-block__anchor')?.getAttribute('href') || '';
                    //     const brand = node.querySelector('.product-block__brand')?.innerText.trim() || '';
                    //     const sku = node.querySelector('.sku')?.innerText.trim() || '';
                    //     const priceText = node.querySelector('.price_method_block_price')?.textContent || '';
                    //     const inStock = node.querySelector('.product-block__input')?.getAttribute('data-stock') !== '0';

                    //     // Extraer número del precio y convertir a float
                    //     const priceMatch = priceText.replace(/\./g, '').match(/\d+/g);
                    //     const price = priceMatch ? parseInt(priceMatch.join('')) : null;

                    const name = (block.querySelector('.product-block__name') as HTMLElement)?.innerText.trim() || null;
                    console.log(name);

                    const link = (block.querySelector('.product-block__anchor') as HTMLAnchorElement)?.href || null;
                    const price = (block.querySelector('.price_method_block_price') as HTMLElement)?.childNodes[0]?.textContent?.trim() || null;
                    const outOfStock = (block.querySelector('.product-block__input')?.getAttribute('data-stock') !== '0') || null;
                    const image = (block.querySelector('img.product-block__image') as HTMLImageElement)?.src || null;
                    const brand = (block.querySelector('.product-block__brand') as HTMLElement)?.innerText.trim() || null;
                    const sku = (block.querySelector('.sku') as HTMLElement)?.innerText.trim() || null;

                    items.push({
                        name,
                        link,
                        price,
                        outOfStock,
                        image,
                        brand,
                        sku,
                    } as Product);
                });

                return items;
            });

            if (products.length === 0) {
                break;
            }

            allProducts.push(...products);
            currentPage++;

            await delay(2);
        } catch (error: any) {
            console.error(`Error navigating to ${url}:`, error);
            if (error.message.includes('429')) {
                console.log('HTTP 429 encountered. Retrying with backoff...');
                await delay(5 * currentPage);
                continue;
            } else {
                console.error(`Error navigating to ${url}:`, error);
                break;
            }
        }
    }

    console.log("All products obtained: ", allProducts.length);

    saveProductsToFile(allProducts, webpage.id);

    await browser.close();
};