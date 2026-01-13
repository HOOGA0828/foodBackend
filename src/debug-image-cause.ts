
import { chromium } from 'playwright';

(async () => {
    try {
        console.log('🚀 分析 7-Eleven 圖片網址結構...');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        const url = 'https://www.sej.co.jp/products/a/thisweek/area/kinki/';
        await page.goto(url);

        // 模擬原本的選擇器
        const selector = 'img[src*="item-image"], img[src*="7api"], img[alt*=""], .product img, .item img';

        console.log(`🔍 使用選擇器: ${selector}`);

        // 抓取所有匹配的圖片
        const images = await page.$$eval(selector, (imgs: any[]) => imgs.slice(0, 5).map(img => ({
            src: img.src,
            dataOriginal: img.getAttribute('data-original'),
            outerHTML: img.outerHTML
        })));

        console.log(`\n📊 採樣前 5 張圖片分析:`);
        console.log('================================================');

        images.forEach((img, i) => {
            console.log(`\n[圖片 ${i + 1}]`);
            console.log(`HTML: ${img.outerHTML.substring(0, 100)}...`);
            console.log(`原始 Src: ${img.src}`);

            // 之前的過濾邏輯檢查
            const hasItemImage = img.src.includes('item-image');
            console.log(`❌ 舊程式碼過濾結果: ${hasItemImage ? '✅ 通過' : '🚫 被過濾 (因為網址不含 item-image)'}`);

            // 現在的過濾邏輯檢查
            const hasValidExt = /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(img.src);
            console.log(`✅ 新程式碼過濾結果: ${hasValidExt ? '✅ 通過' : '🚫 被過濾 (副檔名錯誤)'}`);
        });

        await browser.close();
    } catch (e) {
        console.error('❌ Error:', e);
    }
})();
