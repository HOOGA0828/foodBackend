import { chromium } from 'playwright';
(async () => {
    console.log('Starting minimal playwright test');
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto('https://example.com');
        console.log('Title:', await page.title());
        await browser.close();
        console.log('Done');
    }
    catch (e) {
        console.error('Error:', e);
    }
})();
//# sourceMappingURL=test-minimal-playwright-check.js.map