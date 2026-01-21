
import { chromium } from 'playwright';
import fs from 'fs';

async function dumpHtml() {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    console.log('Navigating to https://www.mos.jp/ ...');
    await page.goto('https://www.mos.jp/', { waitUntil: 'networkidle' });

    // Wait a bit more for any sliders
    await page.waitForTimeout(3000);

    const html = await page.content();
    fs.writeFileSync('mos_full_dump.html', html);
    console.log('HTML saved to mos_full_dump.html');

    // Also print elements that might look like main visual
    const candidates = await page.$$eval('[id*="visual"], [class*="visual"], [class*="banner"], [class*="slide"]', els => els.map(el => ({
        tagName: el.tagName,
        id: el.id,
        className: el.className,
        htmlSnippet: el.outerHTML.substring(0, 100)
    })));

    console.log('Candidates found:', JSON.stringify(candidates, null, 2));

    await browser.close();
}

dumpHtml();
