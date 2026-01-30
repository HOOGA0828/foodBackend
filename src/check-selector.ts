
import { playwright } from 'crawlee';
import { chromium } from 'playwright';
import fs from 'fs/promises';

async function run() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await fs.writeFile('selector-check.txt', 'Starting...\n');

    try {
        await page.goto('https://product.starbucks.co.jp/beverage/?nid=mm');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000); // extra wait

        const selector = '.card-wrap.main-wrap.category-main-layout .card';
        const count = await page.locator(selector).count();

        await fs.appendFile('selector-check.txt', `URL: ${page.url()}\n`);
        await fs.appendFile('selector-check.txt', `Count: ${count}\n`);

        // Also check failure reason if 0
        if (count === 0) {
            const content = await page.content();
            await fs.writeFile('page-dump.html', content);
        }

    } catch (e) {
        await fs.appendFile('selector-check.txt', `Error: ${e}\n`);
    } finally {
        await browser.close();
    }
}

run();
