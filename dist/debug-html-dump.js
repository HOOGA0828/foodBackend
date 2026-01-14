import 'dotenv/config';
import { chromium } from 'playwright';
async function dumpHtml() {
    console.log('Test HTML Dump');
    const url = 'https://www.family.co.jp/campaign/spot/2601_ichigofes_cp_ek8lE1QA.html';
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const logs = await page.evaluate(() => {
            const results = [];
            const els = Array.from(document.body.querySelectorAll('*'));
            const priceEls = els.filter(el => el.children.length === 0 && el.textContent && el.textContent.includes('円')).slice(0, 3);
            for (const el of priceEls) {
                let p = el.parentElement;
                if (p)
                    p = p.parentElement;
                if (p)
                    p = p.parentElement;
                results.push({
                    price: el.textContent,
                    html: p ? p.outerHTML.substring(0, 1000) : 'No parent'
                });
            }
            return results;
        });
        console.log(JSON.stringify(logs, null, 2));
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await browser.close();
    }
}
dumpHtml();
//# sourceMappingURL=debug-html-dump.js.map