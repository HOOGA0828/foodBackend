
import { chromium } from 'playwright';

(async () => {
    try {
        console.log('🚀 Testing List-Only Extraction Logic...');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        const url = 'https://www.sej.co.jp/products/a/thisweek/area/kinki/';
        await page.goto(url);

        const config = {
            productLinkSelector: '.list_inner', // Container
            productTitleSelector: '.item_ttl',
            productImageSelector: 'figure img',
            baseUrl: new URL(url).origin
        };

        // Mimic extractProductLinks logic
        const links = await page.$$eval(
            config.productLinkSelector,
            (elements: any[], config: any) => {
                return elements.map(element => {
                    const anchor = element.tagName === 'A' ? element : element.querySelector('a');
                    const href = anchor?.getAttribute('href');
                    const titleElement = element.querySelector(config.productTitleSelector);
                    const title = titleElement?.textContent?.trim() || anchor?.textContent?.trim() || '';
                    const imgElement = element.querySelector(config.productImageSelector);

                    // simplified image src logic for test
                    let imageUrl = imgElement?.getAttribute('data-original') || imgElement?.getAttribute('src') || '';
                    if (imageUrl && !imageUrl.startsWith('http')) {
                        imageUrl = imageUrl.startsWith('/') ? `${config.baseUrl}${imageUrl}` : `${config.baseUrl}/${imageUrl}`;
                    }

                    const rawText = element.textContent?.trim() || '';

                    return {
                        title,
                        url: href,
                        imageUrl,
                        rawText: rawText.substring(0, 50) + '...' // Preview
                    };
                });
            },
            config
        );

        console.log(`✅ Extracted ${links.length} items.`);
        links.slice(0, 3).forEach((link, i) => {
            console.log(`\n[Item ${i + 1}]`);
            console.log(`  Title: ${link.title}`);
            console.log(`  Image: ${link.imageUrl}`);
            console.log(`  Raw Text: ${link.rawText}`);
        });

        await browser.close();

    } catch (e) {
        console.error('❌ Error:', e);
    }
})();
