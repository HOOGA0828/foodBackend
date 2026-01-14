import { PlaywrightCrawler, RequestQueue } from 'crawlee';
async function main() {
    console.log('Starting inline test...');
    const url = 'https://www.family.co.jp/goods.html';
    let links = [];
    const crawler = new PlaywrightCrawler({
        maxRequestsPerMinute: 10,
        requestHandler: async ({ page, request }) => {
            console.log(`Visited ${request.url}`);
            try {
                await page.waitForSelector('.splide__slideItemWrapper', { timeout: 5000 });
                const found = await page.$$eval('.splide__slideItemWrapper a', (els) => els.map(e => ({ href: e.href, text: e.innerText })));
                console.log(`Found ${found.length} links`);
                links = found.filter((l) => l.href.includes('/goods/'));
            }
            catch (e) {
                console.error('Error in handler:', e);
            }
        }
    });
    await crawler.run([url]);
    console.log(`Filtered links: ${links.length}`);
    if (links.length === 0) {
        console.log('No links found, exiting phase 1.');
        return;
    }
    const targets = links.slice(0, 3);
    const products = [];
    const q = await RequestQueue.open();
    for (const l of targets)
        await q.addRequest({ url: l.href });
    const detailCrawler = new PlaywrightCrawler({
        requestQueue: q,
        requestHandler: async ({ page, request }) => {
            console.log(`Detail: ${request.url}`);
            try {
                const title = await page.textContent('h1');
                console.log(`Title: ${title}`);
                products.push({ title, url: request.url });
            }
            catch (e) {
                console.error('Detail error:', e);
            }
        }
    });
    await detailCrawler.run();
    console.log('Products:', products);
}
main().catch(e => console.error('Global error:', e));
//# sourceMappingURL=test-familymart-inline.js.map