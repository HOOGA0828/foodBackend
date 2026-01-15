
import { chromium } from 'playwright';
import fs from 'fs';

async function debugSukiya() {
    // Clear log
    fs.writeFileSync('sukiya_debug.log', '');

    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync('sukiya_debug.log', msg + '\n');
    };

    log('🚀 Debugging Sukiya Homepage v3...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        const url = 'https://www.sukiya.jp/';
        log(`Visiting: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        // 1. Check for specific selectors
        const selectors = [
            '#main_visual .slick-list',
            '.main_visual .slick-list',
            '.slick-slider',
            '.bx-wrapper' // Sukiya often uses bxSlider too in past, checking just in case
        ];

        for (const s of selectors) {
            const found = await page.$(s);
            log(`Selector "${s}": ${found ? 'FOUND' : 'NOT FOUND'}`);
            if (found) {
                const count = await page.$$eval(s + ' a', els => els.length);
                log(`   -> Contains ${count} links`);
                const html = await found.innerHTML();
                log(`   -> HTML (first 200 chars): ${html.slice(0, 200)}`);
            }
        }

        // 2. Dump all .slick-list to see which one is the banner
        log('\n--- Dumping ALL .slick-list elements ---');
        const allSlicks = await page.$$('.slick-list');
        for (let i = 0; i < allSlicks.length; i++) {
            const html = await allSlicks[i].innerHTML();
            log(`\n[Slick List #${i}]`);
            log(html.slice(0, 500));
        }

    } catch (error) {
        log('Debug Error:' + error);
    } finally {
        await browser.close();
    }
}

debugSukiya();
