import { chromium } from 'playwright';
import * as fs from 'fs';

async function quickTest() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://www.lawson.co.jp/recommend/new/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const baseUrl = 'https://www.lawson.co.jp';
    const products = await page.$$eval('.col-2 li, .col-3 li', (elements: any[], baseUrl: string) => {
        return elements.map(element => {
            const anchor = element.querySelector('a');
            const href = anchor?.getAttribute('href');
            if (!href || !href.includes('/detail/')) return null;

            const title = element.querySelector('.ttl')?.textContent?.trim() || '';
            const imgSrc = element.querySelector('img')?.getAttribute('src') || '';
            const imageUrl = imgSrc ? (imgSrc.startsWith('/') ? `${baseUrl}${imgSrc}` : imgSrc) : '';

            return { title, imageUrl, href };
        }).filter((item: any) => item !== null && item.title);
    }, baseUrl);

    const result = {
        total: products.length,
        withImages: products.filter((p: any) => p.imageUrl).length,
        samples: products.slice(0, 3)
    };

    fs.writeFileSync('d:/project/newFood/backend/lawson-test-result.json', JSON.stringify(result, null, 2), 'utf8');
    console.log(JSON.stringify(result, null, 2));

    await browser.close();
}

quickTest().catch(console.error);
