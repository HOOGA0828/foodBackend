
import 'dotenv/config';
import { chromium } from 'playwright';

async function main() {
    console.log('🔍 Debug: 檢查 FamilyMart 頁面結構');

    const browser = await chromium.launch();
    const page = await browser.newPage();

    const url = 'https://www.family.co.jp/goods.html';
    console.log(`訪問: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // 檢查各種選擇器
    console.log('\n📋 檢查選擇器:');

    const selectors = [
        '.responsive_carousel_module_wrapper',
        '.splide__slide',
        '.splide__slideItemWrapper',
        '.responsive_carousel_module_wrapper .splide__slide',
        '.responsive_carousel_module_wrapper .splide__slideItemWrapper'
    ];

    for (const sel of selectors) {
        const count = await page.$$eval(sel, els => els.length);
        console.log(`  ${sel}: ${count} 個元素`);
    }

    // 提取實際結構
    console.log('\n🎯 提取輪播項目 (前 5 個):');
    const items = await page.$$eval('.responsive_carousel_module_wrapper .splide__slide', (els: HTMLElement[]) => {
        return els.slice(0, 5).map((el, i) => {
            const anchor = el.querySelector('a');
            const img = el.querySelector('img');
            return {
                index: i,
                hasAnchor: !!anchor,
                href: anchor?.href || '',
                text: anchor?.innerText?.trim() || '',
                hasImg: !!img,
                imgSrc: img?.src || '',
                imgAlt: img?.alt || ''
            };
        });
    });

    items.forEach(item => {
        console.log(`\n項目 ${item.index + 1}:`);
        console.log(`  連結: ${item.hasAnchor ? '✅' : '❌'} ${item.href}`);
        console.log(`  文字: ${item.text}`);
        console.log(`  圖片: ${item.hasImg ? '✅' : '❌'} ${item.imgSrc}`);
        console.log(`  Alt: ${item.imgAlt}`);
    });

    await browser.close();
}

main().catch(console.error);
