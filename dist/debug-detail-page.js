import 'dotenv/config';
import { chromium } from 'playwright';
import { createAIParserService } from './services/aiParser.js';
async function main() {
    console.log('🔍 檢查 FamilyMart 詳細頁面結構');
    const aiParser = createAIParserService();
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const url = 'https://www.family.co.jp/goods.html';
    console.log(`\n訪問列表頁: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.responsive_carousel_module_wrapper', { timeout: 10000 });
    const items = await page.$$eval('.responsive_carousel_module_wrapper .splide__slide', (els) => {
        return els.slice(0, 5).map(el => {
            const anchor = el.querySelector('a');
            const img = el.querySelector('img');
            return {
                url: anchor?.href || '',
                text: (anchor?.innerText || '').trim(),
                imgSrc: img?.src || ''
            };
        }).filter(i => i.url && i.imgSrc);
    });
    console.log(`找到 ${items.length} 個候選項目`);
    let foodItemUrl = null;
    for (const item of items) {
        let imgUrl = item.imgSrc;
        if (imgUrl.startsWith('/')) {
            imgUrl = new URL(imgUrl, url).href;
        }
        const isFood = await aiParser.isFoodAdvertisement(imgUrl);
        if (isFood) {
            console.log(`\n✅ 找到食物項目: ${item.text}`);
            foodItemUrl = item.url;
            break;
        }
    }
    if (!foodItemUrl) {
        console.log('\n❌ 沒有找到食物項目');
        await browser.close();
        return;
    }
    console.log(`\n訪問詳細頁面: ${foodItemUrl}`);
    await page.goto(foodItemUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('\n📋 檢查選擇器:');
    const selectors = {
        'h1': 'h1',
        'h1.goods-detail-title': 'h1.goods-detail-title',
        '.goods-detail-title': '.goods-detail-title',
        '.product-title': '.product-title',
        '.item-title': '.item-title',
        'h1[class*="title"]': 'h1[class*="title"]',
        '.price': '.price',
        '.goods-detail-price': '.goods-detail-price',
        '[class*="price"]': '[class*="price"]',
        '.date': '.date',
        '.goods-detail-release-date': '.goods-detail-release-date',
        '[class*="date"]': '[class*="date"]'
    };
    for (const [name, sel] of Object.entries(selectors)) {
        try {
            const text = await page.textContent(sel, { timeout: 1000 });
            console.log(`✅ ${name}: "${text?.trim().substring(0, 50)}..."`);
        }
        catch {
            console.log(`❌ ${name}: 未找到`);
        }
    }
    console.log('\n📄 頁面主要內容 (前 500 字):');
    const bodyText = await page.textContent('body');
    console.log(bodyText?.substring(0, 500));
    await browser.close();
}
main().catch(console.error);
//# sourceMappingURL=debug-detail-page.js.map