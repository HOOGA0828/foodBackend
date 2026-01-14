
import 'dotenv/config';
import { chromium } from 'playwright';
import { createAIParserService } from './services/aiParser.js';

async function testCarouselFiltering() {
    console.log('🎯 測試輪播圖片篩選流程\n');
    console.log('目標: 確認哪些圖片是食物介紹，並提取對應的連結\n');
    console.log('='.repeat(80) + '\n');

    const aiParser = createAIParserService();
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const url = 'https://www.family.co.jp/';
    console.log(`訪問首頁: ${url}\n`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // 等待輪播載入
    await page.waitForSelector('.responsive_carousel_module_wrapper', { timeout: 10000 });

    // 提取所有輪播項目（去重）
    const items = await page.$$eval('.responsive_carousel_module_wrapper .splide__slide', (els: HTMLElement[]) => {
        const seen = new Set<string>();
        return els
            .map((el, index) => {
                const anchor = el.querySelector('a');
                const img = el.querySelector('img');
                const imgSrc = img?.src || '';

                // 去重：同一張圖片只保留一次
                if (!imgSrc || seen.has(imgSrc)) return null;
                seen.add(imgSrc);

                return {
                    index: seen.size,
                    url: anchor?.href || '',
                    text: (anchor?.innerText || '').trim(),
                    imgSrc: imgSrc,
                    imgAlt: img?.alt || ''
                };
            })
            .filter(i => i !== null);
    });

    console.log(`找到 ${items.length} 個不重複的輪播項目\n`);
    console.log('='.repeat(80) + '\n');

    const foodItems = [];

    for (const item of items) {
        console.log(`【輪播項目 ${item.index}】`);
        console.log(`標題文字: ${item.text || '(無文字)'}`);

        // 確保圖片是完整 URL
        let imgUrl = item.imgSrc;
        if (imgUrl.startsWith('/')) {
            imgUrl = new URL(imgUrl, url).href;
        }

        console.log(`圖片: ${imgUrl}`);
        console.log(`連結: ${item.url || '(無連結)'}`);

        // AI 判斷
        console.log('\n🤖 AI 視覺分析...');
        try {
            const isFood = await aiParser.isFoodAdvertisement(imgUrl);

            if (isFood) {
                console.log('✅ 判斷: 這是食物商品介紹');
                console.log(`➡️  將進入此連結抓取詳細資訊: ${item.url}`);
                foodItems.push({
                    text: item.text,
                    url: item.url,
                    imgUrl: imgUrl
                });
            } else {
                console.log('❌ 判斷: 這不是食物商品介紹（可能是活動、會員、APP等）');
                console.log('➡️  將跳過此項目');
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log('⚠️ AI 判斷失敗:', errorMsg);
        }

        console.log('\n' + '='.repeat(80) + '\n');
    }

    await browser.close();

    // 總結
    console.log('\n📊 篩選結果總結');
    console.log('='.repeat(80));
    console.log(`輪播總數: ${items.length} 個`);
    console.log(`✅ 通過 AI 篩選（判定為食物介紹）: ${foodItems.length} 個`);
    console.log(`❌ 未通過篩選（非食物介紹）: ${items.length - foodItems.length} 個\n`);

    if (foodItems.length > 0) {
        console.log('🎯 以下項目將進入第二層爬蟲抓取詳細資訊:\n');
        foodItems.forEach((item, i) => {
            console.log(`${i + 1}. ${item.text}`);
            console.log(`   連結: ${item.url}\n`);
        });
    } else {
        console.log('⚠️ 沒有任何項目通過篩選！');
    }
}

testCarouselFiltering().catch(console.error);
