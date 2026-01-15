
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function dumpHtml() {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage();
        console.log('Navigating to Yoshinoya...');
        await page.goto('https://www.yoshinoya.com/', { waitUntil: 'networkidle', timeout: 60000 });

        // Wait a bit for sliders to init
        await page.waitForTimeout(5000);

        const html = await page.content();
        const outputPath = path.join(process.cwd(), 'yoshinoya_dump.html');
        fs.writeFileSync(outputPath, html);
        console.log(`HTML dumped to ${outputPath}`);

        // Also print some potential selector matches
        const slickCount = await page.$$eval('.slick-list', els => els.length);
        const swiperCount = await page.$$eval('.swiper-wrapper', els => els.length);
        const imgCount = await page.$$eval('img', els => els.length);

        console.log(`Found .slick-list: ${slickCount}`);
        console.log(`Found .swiper-wrapper: ${swiperCount}`);
        console.log(`Found img: ${imgCount}`);

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
}

dumpHtml();
