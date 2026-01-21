
import { chromium } from 'playwright';

async function debugMatsuya() {
    console.log('Starting Matsuya debug final...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        const url = 'https://www.matsuyafoods.co.jp/matsuya/menu/gyumeshi/index.html';
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Find element by text
        const structure = await page.evaluate(() => {
            function getPathTo(element) {
                if (element.id !== '')
                    return "//*[@id='" + element.id + "']";
                if (element === document.body)
                    return element.tagName;
                var ix = 0;
                var siblings = element.parentNode.childNodes;
                for (var i = 0; i < siblings.length; i++) {
                    var sibling = siblings[i];
                    if (sibling === element)
                        return getPathTo(element.parentNode) + '/' + element.tagName + '[' + (ix + 1) + ']';
                    if (sibling.nodeType === 1 && sibling.tagName === element.tagName)
                        ix++;
                }
            }

            // Look for price 460
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let node;
            const results = [];
            while (node = walker.nextNode()) {
                if (node.textContent.includes('460')) {
                    const el = node.parentElement;
                    results.push({
                        text: node.textContent.trim(),
                        tagName: el.tagName,
                        className: el.className,
                        path: getPathTo(el),
                        outerHTML: el.outerHTML
                    });
                }
            }
            return results.slice(0, 3);
        });

        console.log(JSON.stringify(structure, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

debugMatsuya();
