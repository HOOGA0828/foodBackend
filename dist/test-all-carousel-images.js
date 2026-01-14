import 'dotenv/config';
import { chromium } from 'playwright';
import { createAIParserService } from './services/aiParser.js';
async function testAllCarouselImages() {
    console.log('🧪 測試所有輪播圖片的 AI 判斷\n');
    const aiParser = createAIParserService();
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const url = 'https://www.family.co.jp/goods.html';
    console.log(`訪問: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForSelector('.responsive_carousel_module_wrapper', { timeout: 10000 });
    const items = await page.$$eval('.responsive_carousel_module_wrapper .splide__slide', (els) => {
        return els.map((el, index) => {
            const anchor = el.querySelector('a');
            const img = el.querySelector('img');
            return {
                index: index + 1,
                url: anchor?.href || '',
                text: (anchor?.innerText || '').trim(),
                imgSrc: img?.src || '',
                imgAlt: img?.alt || ''
            };
        }).filter(i => i.imgSrc);
    });
    console.log(`找到 ${items.length} 個輪播項目\n`);
    console.log('='.repeat(80) + '\n');
    let foodCount = 0;
    let nonFoodCount = 0;
    for (const item of items) {
        console.log(`【項目 ${item.index}】`);
        console.log(`文字: ${item.text || '(無文字)'}`);
        console.log(`連結: ${item.url || '(無連結)'}`);
        console.log(`圖片 Alt: ${item.imgAlt || '(無 Alt)'}`);
        let imgUrl = item.imgSrc;
        if (imgUrl.startsWith('/')) {
            imgUrl = new URL(imgUrl, url).href;
        }
        console.log(`圖片 URL: ${imgUrl}`);
        console.log('\n🤖 AI 分析中...');
        try {
            const isFood = await aiParser.isFoodAdvertisement(imgUrl);
            if (isFood) {
                console.log('✅ 判斷結果: 【食物商品】');
                foodCount++;
            }
            else {
                console.log('❌ 判斷結果: 【非食物】');
                nonFoodCount++;
            }
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log('⚠️ AI 判斷失敗:', errorMsg);
        }
        console.log('\n' + '='.repeat(80) + '\n');
    }
    await browser.close();
    console.log('\n📊 總結報告');
    console.log('='.repeat(80));
    console.log(`總項目數: ${items.length}`);
    console.log(`✅ 判定為食物: ${foodCount} 個`);
    console.log(`❌ 判定為非食物: ${nonFoodCount} 個`);
    if (foodCount === 0) {
        console.log('\n⚠️ 警告: 沒有任何項目被判定為食物！');
        console.log('可能原因：');
        console.log('1. AI 提示詞太嚴格');
        console.log('2. 圖片內容確實不是食物商品');
        console.log('3. 圖片載入問題');
    }
}
testAllCarouselImages().catch(console.error);
//# sourceMappingURL=test-all-carousel-images.js.map