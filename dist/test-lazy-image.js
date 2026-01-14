import { chromium } from 'playwright';
(async () => {
    try {
        console.log('🚀 Testing Lazy Load Image Extraction...');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const url = 'https://www.sej.co.jp/products/a/thisweek/area/kinki/';
        await page.goto(url);
        await page.waitForSelector('.list_inner');
        const results = await page.$$eval('.list_inner', (elements) => {
            return elements.slice(0, 5).map(el => {
                const img = el.querySelector('figure img');
                if (!img)
                    return { status: 'no_img' };
                const src = img.getAttribute('src');
                const dataOriginal = img.getAttribute('data-original');
                let resolvedUrl = dataOriginal || src || '';
                if (resolvedUrl.includes('giphy.gif'))
                    resolvedUrl = 'INVALID_GIPHY';
                return {
                    rawSrc: src,
                    dataOriginal: dataOriginal,
                    resolvedUrl: resolvedUrl
                };
            });
        });
        console.log('🔍 Extraction Results:');
        results.forEach((r, i) => {
            console.log(`[Item ${i + 1}]`);
            console.log(`  Raw Src: ${r.rawSrc}`);
            console.log(`  Data Original: ${r.dataOriginal}`);
            console.log(`  -> Resolved: ${r.resolvedUrl}`);
            if (r.resolvedUrl === 'INVALID_GIPHY') {
                console.error('  ❌ Failed: Resolved to giphy!');
            }
            else if (r.resolvedUrl && !r.resolvedUrl.includes('giphy')) {
                console.log('  ✅ Success: Got valid image');
            }
            else {
                console.warn('  ⚠️ No image found');
            }
        });
        await browser.close();
    }
    catch (e) {
        console.error('❌ Error:', e);
    }
})();
//# sourceMappingURL=test-lazy-image.js.map