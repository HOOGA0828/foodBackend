
import { chromium } from 'playwright';

async function debugMatsuya() {
    console.log('Starting Matsuya debug relative...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        const url = 'https://www.matsuyafoods.co.jp/matsuya/menu/gyumeshi/index.html';
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Find links that contain 'gyumeshi' and '.html'
        const structure = await page.$$eval('a', (els) => {
            return els
                .filter(el => el.href.includes('/menu/gyumeshi/') && el.href.includes('.html'))
                .slice(0, 3)
                .map(el => {
                    return {
                        tagName: el.tagName,
                        // check if img is inside
                        hasImg: !!el.querySelector('img'),
                        // check parent
                        parentTagName: el.parentElement?.tagName,
                        parentClass: el.parentElement?.className,
                        // dump parent innerHTML (truncated)
                        parentHTML: el.parentElement?.innerHTML.substring(0, 500)
                    };
                });
        });

        console.log(JSON.stringify(structure, null, 2));

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

debugMatsuya();
