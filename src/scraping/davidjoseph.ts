import puppeteer from 'puppeteer-extra';
import fs from 'fs';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Product } from '../interfaces';

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

const saveProductsToFile = (products: Product[]) => {
    const filePath = 'db/db_picslab.json';
    const dir = 'db';

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    const jsonData = { products };
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log(`Products saved to ${filePath}`);
};

const getProducts = async () => {
    const baseUrl = 'https://picslabstore.cl/search?q=&page=';
    let currentPage = 23;
    const allProducts: Product[] = [];

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();



    saveProductsToFile(allProducts);

    await browser.close();
}