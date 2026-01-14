import { PlaywrightCrawler } from 'crawlee';
export class LawsonStrategy {
    aiParser;
    constructor(aiParser) {
        this.aiParser = aiParser;
    }
    async scrape(brandConfig) {
        console.log(`🏪 [LawsonStrategy] 開始抓取 Lawson (最近3個日期)...`);
        const startTime = Date.now();
        let allProducts = [];
        const targetUrls = new Set();
        let datesDiscovered = false;
        const crawler = new PlaywrightCrawler({
            maxRequestsPerMinute: 10,
            requestHandler: async ({ request, page }) => {
                console.log(`📄 [LawsonStrategy] 正在處理頁面: ${request.url}`);
                const navExists = await page.locator('.contentsNav').count() > 0;
                if (navExists && !datesDiscovered) {
                    console.log('📅 [LawsonStrategy] 發現 contentsNav，正在提取日期...');
                    const dateLinks = await page.$$eval('.contentsNav li a', (anchors) => {
                        return anchors.map(a => ({
                            text: a.textContent?.trim() || '',
                            href: a.getAttribute('href')
                        })).filter(link => link.href && link.text.includes('発売'));
                    });
                    console.log(`📅 [LawsonStrategy] 找到 ${dateLinks.length} 個日期連結`);
                    const top3Links = dateLinks.slice(0, 3);
                    const baseUrl = new URL(brandConfig.url).origin;
                    for (const link of top3Links) {
                        if (link.href) {
                            const absoluteUrl = link.href.startsWith('http') ? link.href :
                                link.href.startsWith('/') ? `${baseUrl}${link.href}` : `${baseUrl}/${link.href}`;
                            console.log(`🎯 [LawsonStrategy] 加入目標日期頁面: ${link.text} -> ${absoluteUrl}`);
                            targetUrls.add(absoluteUrl);
                            if (absoluteUrl !== request.url) {
                                await crawler.addRequests([absoluteUrl]);
                            }
                        }
                    }
                    datesDiscovered = true;
                }
                try {
                    await page.waitForSelector('.col-2, .col-3, .list_inner, .recommendList', { timeout: 5000 });
                }
                catch (e) {
                    console.log('⚠️ [LawsonStrategy] 未發現標準產品列表容器');
                }
                const links = await this.extractProductsFromPage(page, brandConfig);
                console.log(`✅ [LawsonStrategy] 頁面找到 ${links.length} 個產品`);
                if (links.length > 0) {
                    const products = await this.parseProducts(brandConfig, links);
                    allProducts.push(...products);
                }
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
        const selector = '.col-2 li, .col-3 li, .recommendList li, .list_inner';
        return await page.$$eval(selector, (elements, baseUrl) => {
            return elements.map(element => {
                const anchor = element.querySelector('a');
                const href = anchor?.getAttribute('href');
                if (!href)
                    return null;
                if (href.includes('index.html') && !href.includes('detail'))
                    return null;
                const titleElement = element.querySelector('.ttl, .item-title, .product-name, p.text');
                const title = titleElement?.textContent?.trim() || anchor?.textContent?.trim() || '';
                const imgElement = element.querySelector('img');
                let imageUrl = '';
                if (imgElement) {
                    imageUrl = imgElement.getAttribute('src') || '';
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
            }).filter((item) => item !== null && item.title.length > 0);
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
                await new Promise(resolve => setTimeout(resolve, 100));
                const aiResult = await this.aiParser.parseProducts(parseRequest);
                if (aiResult.success && aiResult.products.length > 0) {
                    const p = aiResult.products[0];
                    if (p) {
                        results.push({
                            ...p,
                            originalName: link.title,
                            translatedName: p.translatedName || link.title,
                            imageUrl: link.imageUrl || p.imageUrl,
                            sourceUrl: link.url
                        });
                    }
                }
                else {
                    const fallbackProduct = {
                        originalName: link.title,
                        translatedName: link.title,
                        imageUrl: link.imageUrl,
                        sourceUrl: link.url,
                        isNew: true,
                        originalDescription: link.rawText
                    };
                    results.push(fallbackProduct);
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
            const key = `${product.originalName}-${product.sourceUrl}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
}
//# sourceMappingURL=lawson.js.map