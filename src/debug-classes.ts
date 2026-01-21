
import { chromium } from 'playwright';

async function debugMatsuya() {
    console.log('Starting Matsuya debug classes...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        const url = 'https://www.matsuyafoods.co.jp/matsuya/menu/gyumeshi/index.html';
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const info = await page.evaluate(() => {
            // Find text node "牛めし"
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.trim() === '牛めし') {
                    const el = node.parentElement;
                    return {
                        text: node.textContent,
                        tagName: el.tagName,
                        className: el.className,
                        parentTagName: el.parentElement.tagName,
                        parentClassName: el.parentElement.className,
                        grandParentTagName: el.parentElement.parentElement.tagName,
                        grandParentClassName: el.parentElement.parentElement.className
                    };
                }
            }
            return null;
        });

        console.log(JSON.stringify(info, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

debugMatsuya();
