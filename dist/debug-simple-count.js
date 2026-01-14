import 'dotenv/config';
import { chromium } from 'playwright';
async function simpleCount() {
    console.log('Test Simple Count');
    const url = 'https://www.family.co.jp/campaign/spot/2601_ichigofes_cp_ek8lE1QA.html';
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.evaluate(async () => {
            window.scrollBy(0, 500);
            await new Promise(r => setTimeout(r, 500));
        });
        const count = await page.evaluate(() => {
            const els = Array.from(document.body.querySelectorAll('*'));
            return els.filter(el => el.textContent && el.textContent.includes('円')).length;
        });
        console.log(`Found ${count} elements with "円"`);
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await browser.close();
    }
}
simpleCount();
//# sourceMappingURL=debug-simple-count.js.map