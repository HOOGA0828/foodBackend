
import { chromium } from 'playwright';

async function debugMatsuya() {
    console.log('Starting Matsuya debug...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        const url = 'https://www.matsuyafoods.co.jp/matsuya/menu/gyumeshi/index.html';
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // Dump the first few links that look like products
        const links = await page.$$eval('a', (els) => {
            return els
                .filter(el => el.href.includes('/menu/') && el.href.includes('.html'))
                .slice(0, 3)
                .map(el => el.outerHTML);
        });

        console.log('\n--- Link HTML Dump ---');
        links.forEach((html, i) => {
            console.log(`\nLink ${i + 1}:`);
            console.log(html);
        });

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

debugMatsuya();
