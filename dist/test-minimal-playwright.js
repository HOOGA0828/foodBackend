import { chromium } from 'playwright';
(async () => {
    try {
        console.log('🚀 Launching browser...');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        console.log('🌍 Navigating...');
        await page.goto('https://example.com');
        const title = await page.title();
        console.log(`✅ Page Title: ${title}`);
        await browser.close();
        console.log('🚪 Browser closed.');
    }
    catch (e) {
        console.error('❌ Playwright Error:', e);
    }
})();
//# sourceMappingURL=test-minimal-playwright.js.map