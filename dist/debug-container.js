import 'dotenv/config';
import { chromium } from 'playwright';
async function debugContainer() {
    console.log('Test Container Logic');
    const url = 'https://www.family.co.jp/campaign/spot/2601_ichigofes_cp_ek8lE1QA.html';
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.evaluate(async () => {
            window.scrollBy(0, 1000);
            await new Promise(r => setTimeout(r, 1000));
        });
        const logs = await page.evaluate(() => {
            const results = [];
            const els = Array.from(document.body.querySelectorAll('*'));
            const priceEls = els.filter(el => el.children.length === 0 && el.textContent && el.textContent.includes('円')).slice(0, 5);
            for (const el of priceEls) {
                let p = el.parentElement;
                let foundImg = false;
                let structure = [];
                for (let i = 0; i < 5; i++) {
                    if (!p)
                        break;
                    const img = p.querySelector('img');
                    const hasTitle = p.querySelector('h3, h4, strong, .title');
                    structure.push({
                        tag: p.tagName,
                        cls: p.className,
                        hasImg: !!img,
                        hasTitle: !!hasTitle,
                        imgSrc: img ? img.src : null
                    });
                    if (img)
                        foundImg = true;
                    p = p.parentElement;
                }
                results.push({
                    text: el.textContent,
                    structure: structure
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
debugContainer();
//# sourceMappingURL=debug-container.js.map