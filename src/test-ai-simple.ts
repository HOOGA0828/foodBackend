
import 'dotenv/config';
import { chromium } from 'playwright';
import { createAIParserService } from './services/aiParser.js';

async function main() {
    console.log('🧪 測試 AI 視覺篩選 (簡化版)');

    const aiParser = createAIParserService();
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const url = 'https://www.family.co.jp/goods.html';
    console.log(`\n訪問: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // 等待輪播載入
    await page.waitForSelector('.responsive_carousel_module_wrapper', { timeout: 10000 });

    // 提取前 3 個輪播項目
    const items = await page.$$eval('.responsive_carousel_module_wrapper .splide__slide', (els: HTMLElement[]) => {
        return els.slice(0, 3).map(el => {
            const anchor = el.querySelector('a');
            const img = el.querySelector('img');
            return {
                url: anchor?.href || '',
                text: (anchor?.innerText || '').trim(),
                imgSrc: img?.src || ''
            };
        }).filter(i => i.url && i.imgSrc);
    });

    console.log(`\n找到 ${items.length} 個候選項目\n`);

    // 逐一測試 AI 判斷
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`\n--- 項目 ${i + 1} ---`);
        console.log(`文字: ${item.text}`);
        console.log(`連結: ${item.url}`);
        console.log(`圖片: ${item.imgSrc}`);

        // 確保圖片是完整 URL
        let imgUrl = item.imgSrc;
        if (imgUrl.startsWith('/')) {
            imgUrl = new URL(imgUrl, url).href;
        }

        console.log(`完整圖片 URL: ${imgUrl}`);

        // AI 判斷
        const isFood = await aiParser.isFoodAdvertisement(imgUrl);
        console.log(`AI 判斷結果: ${isFood ? '✅ 食物' : '❌ 非食物'}`);
    }

    await browser.close();
    console.log('\n✅ 測試完成');
}

main().catch(console.error);
