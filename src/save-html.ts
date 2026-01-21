
import { chromium } from 'playwright';
import fs from 'fs';

async function saveHtml() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        const url = 'https://www.matsuyafoods.co.jp/matsuya/menu/gyumeshi/index.html';
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const content = await page.content();
        fs.writeFileSync('matsuya.html', content);
        console.log('Saved matsuya.html');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

saveHtml();
