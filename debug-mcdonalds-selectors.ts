import { chromium } from 'playwright';
import fs from 'fs';

async function debugMcdonalds() {
    console.log('Launching browser...');
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        console.log('Visiting homepage...');
        await page.goto('https://www.mcdonalds.co.jp/', { waitUntil: 'networkidle' });

        // Dump Homepage HTML
        console.log('Dumping homepage HTML...');
        const homeHtml = await page.content();
        fs.writeFileSync('mcd_home.html', homeHtml);

        // Find Swiper/Banner links
        const banners = await page.$$eval('.swiper-slide a', (els) => {
            return els.map(el => ({
                href: el.href,
                text: el.innerText,
                html: el.outerHTML
            }));
        });

        console.log(`Found ${banners.length} banners.`);
        banners.forEach((b, i) => console.log(`[${i}] ${b.href}`));

        // If banners found, visit the first valid product one
        const productBanner = banners.find(b => b.href.includes('/campaign/') || b.href.includes('/products/'));

        if (productBanner) {
            console.log(`Visiting detail page: ${productBanner.href}`);
            await page.goto(productBanner.href, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000); // Wait for dynamic content

            const detailHtml = await page.content();
            fs.writeFileSync('mcd_detail.html', detailHtml);
            console.log('Dumping detail page HTML...');
        } else {
            console.log('No obvious product banner found to visit.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
}

debugMcdonalds();
