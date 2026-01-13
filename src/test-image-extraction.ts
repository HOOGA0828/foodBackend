
import { chromium } from 'playwright';

// Copy of the logic from scraper.ts
async function extractPageImages(page: any, deepCrawling: any, baseUrl: string): Promise<string[]> {
    if (!deepCrawling?.productImageSelector) {
        return [];
    }

    try {
        // 等待更長時間確保lazy loading圖片載入
        await page.waitForTimeout(3000);

        const images = await page.$$eval(
            deepCrawling.productImageSelector,
            (imgs: any[], baseUrl: string) => imgs.map(img => {
                // 優先使用 data-original (lazy loading), 然後是其他屬性
                let src = img.getAttribute('data-original') ||
                    img.getAttribute('data-src') ||
                    img.getAttribute('data-lazy-src') ||
                    img.getAttribute('data-lazy') ||
                    img.getAttribute('src') ||
                    img.src;

                if (!src) return null;

                // 處理相對路徑轉絕對路徑
                if (!src.startsWith('http')) {
                    if (src.startsWith('/')) {
                        src = `${baseUrl}${src}`;
                    } else {
                        src = `${baseUrl}/${src}`;
                    }
                }

                return src;
            }).filter((src): src is string => {
                if (!src) return false;

                // 嚴格過濾圖片副檔名
                // 使用正則表達式檢查是否以這些副檔名結尾 (忽略 query string)
                return /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(src) && !src.includes('giphy.gif');
            }),
            baseUrl
        );

        console.log(`🖼️ [Scraper] 提取到 ${images.length} 張產品圖片`);
        return images;
    } catch (error) {
        console.warn(`⚠️ [Scraper] 提取頁面圖片失敗:`, error);
        return [];
    }
}

(async () => {
    try {
        console.log('🚀 Launching browser...');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        const url = 'https://www.sej.co.jp/products/a/thisweek/area/kinki/';
        console.log(`🌍 Navigating to ${url}...`);
        await page.goto(url);

        // 7-Eleven Config from brands.ts
        const config = {
            productImageSelector: 'img[src*="item-image"], img[src*="7api"], img[alt*=""], .product img, .item img'
        };

        const baseUrl = new URL(url).origin;
        console.log("🔍 Extracting images...");
        const images = await extractPageImages(page, config, baseUrl);

        console.log("✅ Results:");
        images.forEach(img => {
            console.log(`  - ${img}`);
            const isValid = /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(img);
            if (!isValid) console.error("  ❌ INVALID EXTENSION!");
        });

        if (images.length > 0) {
            console.log("✅ Image extraction verified.");
        } else {
            console.log("❌ No images found. Check selector.");
        }

        await browser.close();
    } catch (e) {
        console.error('❌ Error:', e);
    }
})();
