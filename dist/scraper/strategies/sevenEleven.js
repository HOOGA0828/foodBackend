import { PlaywrightCrawler } from 'crawlee';
export class SevenElevenStrategy {
    aiParser;
    constructor(aiParser) {
        this.aiParser = aiParser;
    }
    async scrape(brandConfig) {
        console.log(`🏪 [SevenElevenStrategy] 開始抓取 7-Eleven...`);
        const startTime = Date.now();
        let allProducts = [];
        let pageCount = 0;
        const MAX_PAGES = 5;
        const crawler = new PlaywrightCrawler({
            maxRequestsPerMinute: 10,
            requestHandlerTimeoutSecs: 300,
            requestHandler: async ({ request, page }) => {
                console.log(`📄 [SevenElevenStrategy] 正在處理頁面: ${request.url}`);
                await page.waitForSelector('.list_inner', { timeout: 10000 }).catch(() => console.log('⚠️ 等待 .list_inner 超時'));
                const links = await this.extractProductsFromPage(page, brandConfig);
                console.log(`✅ [SevenElevenStrategy] 頁面找到 ${links.length} 個產品`);
                const nextUrl = await page.$$eval('.pager_ctrl a', (anchors) => {
                    const nextLink = anchors.find(a => a.textContent.includes('次へ'));
                    return nextLink ? nextLink.getAttribute('href') : null;
                }).catch(() => null);
                if (nextUrl && pageCount < MAX_PAGES) {
                    const baseUrl = new URL(brandConfig.url).origin;
                    const absoluteNextUrl = nextUrl.startsWith('http') ? nextUrl :
                        nextUrl.startsWith('/') ? `${baseUrl}${nextUrl}` : `${baseUrl}/${nextUrl}`;
                    console.log(`➡️ [SevenElevenStrategy] 發現下一頁 (${pageCount + 1}/${MAX_PAGES}): ${absoluteNextUrl}`);
                    await crawler.addRequests([absoluteNextUrl]);
                    pageCount++;
                }
                else {
                    console.log('⏹️ [SevenElevenStrategy] 未找到下一頁連結 (次へ) 或達到頁數限制。');
                }
                const products = await this.parseProducts(brandConfig, links);
                allProducts.push(...products);
            },
        });
        await crawler.run([brandConfig.url]);
        const uniqueProducts = this.removeDuplicateProducts(allProducts);
        const executionTime = Date.now() - startTime;
        return {
            brand: {
                name: brandConfig.name,
                displayName: brandConfig.displayName,
                category: brandConfig.category,
                url: brandConfig.url
            },
            productsCount: uniqueProducts.length,
            products: uniqueProducts,
            status: 'success',
            executionTime,
            scrapedAt: new Date()
        };
    }
    async extractProductsFromPage(page, brandConfig) {
        const baseUrl = new URL(brandConfig.url).origin;
        return await page.$$eval('.list_inner', (elements, baseUrl) => {
            return elements.map(element => {
                const anchor = element.tagName === 'A' ? element : element.querySelector('a');
                const href = anchor?.getAttribute('href');
                if (!href)
                    return null;
                const titleElement = element.querySelector('.item_ttl');
                const title = titleElement?.textContent?.trim() || anchor?.textContent?.trim() || '';
                const imgElement = element.querySelector('figure img');
                let imageUrl = '';
                if (imgElement) {
                    imageUrl = imgElement.getAttribute('data-original') ||
                        imgElement.getAttribute('data-src') ||
                        imgElement.getAttribute('src') || '';
                    if (imageUrl.includes('giphy.gif'))
                        imageUrl = '';
                }
                const absoluteUrl = href.startsWith('http') ? href :
                    href.startsWith('/') ? `${baseUrl}${href}` : `${baseUrl}/${href}`;
                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
                }
                const rawText = element.textContent?.trim() || '';
                return {
                    title,
                    url: absoluteUrl,
                    imageUrl,
                    rawText,
                    isNew: true
                };
            }).filter((item) => item !== null);
        }, baseUrl);
    }
    async parseProducts(brandConfig, links) {
        const results = [];
        for (const link of links) {
            const contentText = link.rawText || `Product: ${link.title}`;
            try {
                const parseRequest = {
                    brandName: brandConfig.name,
                    listMarkdownContent: contentText,
                    productLink: link,
                    sourceUrl: link.url
                };
                await new Promise(resolve => setTimeout(resolve, 200));
                const aiResult = await this.aiParser.parseProducts(parseRequest);
                if (aiResult.success && aiResult.products.length > 0) {
                    const p = aiResult.products[0];
                    results.push({
                        ...p,
                        translatedName: p.translatedName || p.originalName || link.title,
                        originalName: link.title,
                        imageUrl: link.imageUrl || p.imageUrl || '',
                        sourceUrl: link.url
                    });
                }
                else {
                    results.push({
                        originalName: link.title,
                        translatedName: link.title,
                        imageUrl: link.imageUrl,
                        sourceUrl: link.url,
                        isNew: true,
                        description: link.rawText
                    });
                }
            }
            catch (e) {
                console.error(`解析失敗 ${link.title}:`, e);
            }
        }
        return results;
    }
    removeDuplicateProducts(products) {
        const seen = new Set();
        return products.filter(product => {
            const nameKey = product.originalName || product.translatedName;
            const key = `${nameKey}-${product.sourceUrl}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
}
//# sourceMappingURL=sevenEleven.js.map