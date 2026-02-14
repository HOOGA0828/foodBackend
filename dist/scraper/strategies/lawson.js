import { chromium } from 'playwright';
export class LawsonStrategy {
    aiParser;
    constructor(aiParser) {
        this.aiParser = aiParser;
    }
    async scrape(brandConfig) {
        console.log(`🏪 [LawsonStrategy] 開始抓取 Lawson (Native Playwright)...`);
        const startTime = Date.now();
        let allProducts = [];
        const visitedUrls = new Set();
        const queue = [brandConfig.url];
        let browser = null;
        try {
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            let datesDiscovered = false;
            while (queue.length > 0) {
                const currentUrl = queue.shift();
                if (visitedUrls.has(currentUrl))
                    continue;
                visitedUrls.add(currentUrl);
                console.log(`📄 [LawsonStrategy] 正在處理頁面: ${currentUrl}`);
                try {
                    await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    if (!datesDiscovered) {
                        try {
                            await Promise.race([
                                page.waitForSelector('.contentsNav', { timeout: 5000 }),
                                page.waitForSelector('.col-2, .col-3, .list_inner, .recommendList', { timeout: 5000 })
                            ]).catch(() => { });
                        }
                        catch (e) { }
                        const navExists = await page.locator('.contentsNav').count() > 0;
                        if (navExists) {
                            console.log('📅 [LawsonStrategy] 發現 contentsNav，正在提取日期...');
                            const dateLinks = await page.$$eval('.contentsNav li a', (anchors) => {
                                return anchors.map(a => ({
                                    text: a.textContent?.trim() || '',
                                    href: a.getAttribute('href')
                                })).filter((link) => link.href && link.text.includes('発売'));
                            });
                            console.log(`📅 [LawsonStrategy] 找到 ${dateLinks.length} 個日期連結`);
                            const top3Links = dateLinks.slice(0, 3);
                            const baseUrl = new URL(brandConfig.url).origin;
                            for (const link of top3Links) {
                                if (link.href) {
                                    const absoluteUrl = link.href.startsWith('http') ? link.href :
                                        link.href.startsWith('/') ? `${baseUrl}${link.href}` : `${baseUrl}/${link.href}`;
                                    if (!visitedUrls.has(absoluteUrl) && !queue.includes(absoluteUrl)) {
                                        console.log(`🎯 [LawsonStrategy] 加入目標日期頁面: ${link.text} -> ${absoluteUrl}`);
                                        queue.push(absoluteUrl);
                                    }
                                }
                            }
                            datesDiscovered = true;
                        }
                    }
                    const links = await this.extractProductsFromPage(page, brandConfig);
                    console.log(`✅ [LawsonStrategy] 頁面找到 ${links.length} 個產品`);
                    if (links.length > 0) {
                        const products = await this.parseProducts(brandConfig, links);
                        allProducts.push(...products);
                    }
                }
                catch (err) {
                    console.error(`❌ [LawsonStrategy] 頁面處理失敗: ${currentUrl}`, err);
                }
            }
        }
        catch (error) {
            console.error('❌ [LawsonStrategy] 瀏覽器啟動或執行失敗:', error);
            return {
                brand: {
                    name: brandConfig.name,
                    displayName: brandConfig.displayName,
                    category: brandConfig.category,
                    url: brandConfig.url
                },
                productsCount: 0,
                products: [],
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                executionTime: Date.now() - startTime,
                scrapedAt: new Date()
            };
        }
        finally {
            if (browser)
                await browser.close();
        }
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
        const selector = '.col-2 li, .col-3 li, .recommendList li, .list_inner';
        return await page.$$eval(selector, (elements, baseUrl) => {
            return elements.map(element => {
                const anchor = element.querySelector('a');
                const href = anchor?.getAttribute('href');
                if (!href)
                    return null;
                if (href.includes('index.html') && !href.includes('detail'))
                    return null;
                if (!href.includes('/detail/'))
                    return null;
                const titleElement = element.querySelector('.ttl, .item-title, .product-name, p.text');
                const title = titleElement?.textContent?.trim() || anchor?.textContent?.trim() || '';
                const imgElement = element.querySelector('img');
                let imageUrl = '';
                if (imgElement) {
                    imageUrl = imgElement.getAttribute('data-original') ||
                        imgElement.getAttribute('data-src') ||
                        imgElement.getAttribute('src') || '';
                    if (imageUrl.includes('giphy.gif') || imageUrl.includes('placeholder')) {
                        imageUrl = '';
                    }
                }
                const priceElement = element.querySelector('.price, .item-price');
                const priceText = priceElement?.textContent?.trim() || '';
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
                    rawText: `${rawText} ${priceText}`,
                    isNew: true
                };
            }).filter((item) => item !== null && item.title && item.title.length > 0);
        }, baseUrl);
    }
    async parseProducts(brandConfig, links) {
        const results = [];
        const BATCH_SIZE = 5;
        for (let i = 0; i < links.length; i += BATCH_SIZE) {
            const batchLinks = links.slice(i, i + BATCH_SIZE);
            console.log(`🤖 [LawsonStrategy] 批次處理第 ${i + 1} - ${Math.min(i + BATCH_SIZE, links.length)} 筆 (共 ${links.length} 筆)`);
            const batchRequests = batchLinks.map(link => ({
                brandName: brandConfig.name,
                listMarkdownContent: link.rawText || `Product: ${link.title}`,
                productLink: link,
                sourceUrl: link.url
            }));
            try {
                await new Promise(resolve => setTimeout(resolve, 100));
                const batchResults = await this.aiParser.parseProductsBatch(batchRequests);
                if (batchResults && batchResults.length > 0) {
                    const mergedResults = batchResults.map((product, idx) => ({
                        ...product,
                        imageUrl: batchLinks[idx]?.imageUrl || product.imageUrl,
                        originalName: batchLinks[idx]?.title || product.originalName
                    }));
                    results.push(...mergedResults);
                }
                else {
                    console.warn(`⚠️ [LawsonStrategy] 批次解析未回傳結果，改用 Fallback`);
                    batchLinks.forEach(link => {
                        results.push({
                            originalName: link.title,
                            translatedName: link.title,
                            imageUrl: link.imageUrl,
                            sourceUrl: link.url,
                            isNew: true,
                            originalDescription: link.rawText
                        });
                    });
                }
            }
            catch (e) {
                console.error(`❌ [LawsonStrategy] 批次傳送失敗:`, e);
                batchLinks.forEach(link => {
                    results.push({
                        originalName: link.title,
                        translatedName: link.title,
                        imageUrl: link.imageUrl,
                        sourceUrl: link.url,
                        isNew: true,
                        originalDescription: link.rawText
                    });
                });
            }
        }
        return results;
    }
    removeDuplicateProducts(products) {
        const seen = new Set();
        return products.filter(product => {
            const key = `${product.originalName}-${product.sourceUrl}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
}
//# sourceMappingURL=lawson.js.map