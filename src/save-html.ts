
import { chromium } from 'playwright';
import fs from 'fs';

async function saveHtml() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        const url = 'https://www.yoshinoya.com/';
        await page.goto(url, { waitUntil: 'networkidle' });
        const content = await page.content();
        fs.writeFileSync('yoshinoya.html', content);
        console.log('Saved yoshinoya.html');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

saveHtml();
