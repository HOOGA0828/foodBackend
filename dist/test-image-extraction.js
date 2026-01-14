import { chromium } from 'playwright';
async function extractPageImages(page, deepCrawling, baseUrl) {
    if (!deepCrawling?.productImageSelector) {
        return [];
    }
    try {
        await page.waitForTimeout(3000);
        const images = await page.$$eval(deepCrawling.productImageSelector, (imgs, baseUrl) => imgs.map(img => {
            let src = img.getAttribute('data-original') ||
                img.getAttribute('data-src') ||
                img.getAttribute('data-lazy-src') ||
                img.getAttribute('data-lazy') ||
                img.getAttribute('src') ||
                img.src;
            if (!src)
                return null;
            if (!src.startsWith('http')) {
                if (src.startsWith('/')) {
                    src = `${baseUrl}${src}`;
                }
                else {
                    src = `${baseUrl}/${src}`;
                }
            }
            return src;
        }).filter((src) => {
            if (!src)
                return false;
            return /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(src) && !src.includes('giphy.gif');
        }), baseUrl);
        console.log(`🖼️ [Scraper] 提取到 ${images.length} 張產品圖片`);
        return images;
    }
    catch (error) {
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
            if (!isValid)
                console.error("  ❌ INVALID EXTENSION!");
        });
        if (images.length > 0) {
            console.log("✅ Image extraction verified.");
        }
        else {
            console.log("❌ No images found. Check selector.");
        }
        await browser.close();
    }
    catch (e) {
        console.error('❌ Error:', e);
    }
})();
//# sourceMappingURL=test-image-extraction.js.map