import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { htmlToMarkdown, estimateTokenCount } from '../utils/htmlCleaner.js';
export class WebScraper {
    aiParser;
    constructor(aiParser) {
        this.aiParser = aiParser;
    }
    async scrapeAndParseBrand(brandConfig) {
        const startTime = Date.now();
        try {
            console.log(`🕷️ [Scraper] 開始第一階段：抓取 ${brandConfig.displayName} 列表頁面`);
            const scrapedData = await this.scrapeListPage(brandConfig);
            if (!scrapedData.productLinks || scrapedData.productLinks.length === 0) {
                console.log(`⚠️ [Scraper] ${brandConfig.displayName} 未找到產品連結，跳過二層抓取`);
                return await this.parseWithoutDeepCrawling(brandConfig, scrapedData);
            }
            const hasImageBasedLinks = scrapedData.productLinks?.some(link => link.url === scrapedData.url && link.imageUrl);
            console.log(`🔍 [Scraper] 檢查圖片連結: hasImageBasedLinks=${hasImageBasedLinks}, totalLinks=${scrapedData.productLinks?.length}`);
            if (hasImageBasedLinks) {
                console.log(`🖼️ [Scraper] ${brandConfig.displayName} 檢測到基於圖片的連結，使用特殊解析模式`);
                return await this.parseWithImageBasedLinks(brandConfig, scrapedData);
            }
            console.log(`✅ [Scraper] ${brandConfig.displayName} 找到 ${scrapedData.productLinks.length} 個產品連結`);
            console.log(`🔍 [Scraper] 開始第二階段：深度抓取 ${brandConfig.displayName} 詳細頁面`);
            const detailedData = await this.scrapeDetailPages(brandConfig, scrapedData.productLinks);
            console.log(`🤖 [Scraper] 開始第三階段：解析 ${brandConfig.displayName} 產品資訊`);
            const products = await this.parseWithDeepCrawling(brandConfig, scrapedData, detailedData);
            const executionTime = Date.now() - startTime;
            console.log(`🎉 [Scraper] ${brandConfig.displayName} 二層抓取完成: ${products.length} 個產品，耗時 ${executionTime}ms`);
            return {
                brand: {
                    name: brandConfig.name,
                    displayName: brandConfig.displayName,
                    category: brandConfig.category,
                    url: brandConfig.url
                },
                productsCount: products.length,
                products,
                status: 'success',
                executionTime,
                scrapedAt: new Date()
            };
        }
        catch (error) {
            console.error(`❌ [Scraper] ${brandConfig.displayName} 二層抓取失敗:`, error);
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
                errorMessage: error instanceof Error ? error.message : '未知錯誤',
                executionTime: Date.now() - startTime,
                scrapedAt: new Date()
            };
        }
    }
    async scrapeListPage(brandConfig) {
        return new Promise(async (resolve, reject) => {
            try {
                const crawler = new PlaywrightCrawler({
                    maxRequestsPerMinute: 10,
                    maxConcurrency: 1,
                    async requestHandler({ request, page }) {
                        try {
                            console.log(`📄 [Scraper] 抓取列表頁面: ${request.url}`);
                            await page.waitForLoadState('networkidle');
                            await performPageActions(page, brandConfig);
                            const waitTime = brandConfig.options?.waitFor || 1000;
                            await page.waitForTimeout(waitTime);
                            const htmlContent = await page.content();
                            let targetHtml = htmlContent;
                            if (brandConfig.newProductSelector) {
                                try {
                                    await page.waitForSelector(brandConfig.newProductSelector, { timeout: 10000 });
                                    const element = await page.$(brandConfig.newProductSelector);
                                    if (element) {
                                        targetHtml = await element.innerHTML();
                                    }
                                }
                                catch (error) {
                                    console.warn(`⚠️ [Scraper] 無法找到新品選擇器 ${brandConfig.newProductSelector}`);
                                }
                            }
                            let productLinks = await extractProductLinks(page, brandConfig);
                            if (!productLinks || productLinks.length === 0) {
                                console.log(`🔍 [Scraper] 未找到產品連結，嘗試提取頁面圖片...`);
                                const pageImages = await extractPageImages(page, brandConfig);
                                console.log(`🖼️ [Scraper] 找到 ${pageImages.length} 張頁面圖片`);
                                if (pageImages.length > 0) {
                                    productLinks = pageImages.map((imageUrl, index) => ({
                                        title: `產品 ${index + 1}`,
                                        url: request.url,
                                        imageUrl: imageUrl,
                                        isNew: true
                                    }));
                                    console.log(`✅ [Scraper] 創建了 ${productLinks.length} 個基於圖片的產品連結`);
                                }
                                else {
                                    console.log(`❌ [Scraper] 未找到任何頁面圖片`);
                                }
                            }
                            else {
                                console.log(`✅ [Scraper] 找到 ${productLinks.length} 個常規產品連結`);
                            }
                            const scrapedData = {
                                brandName: brandConfig.name,
                                url: request.url,
                                scrapedAt: new Date(),
                                htmlContent: targetHtml,
                                markdownContent: htmlToMarkdown(targetHtml),
                                productLinks
                            };
                            resolve(scrapedData);
                        }
                        catch (error) {
                            reject(error);
                        }
                    },
                    failedRequestHandler({ request }) {
                        console.error(`❌ [Scraper] 列表頁面請求失敗: ${request.url}`);
                        reject(new Error(`請求失敗: ${request.url}`));
                    }
                });
                await crawler.addRequests([{
                        url: brandConfig.url,
                        userData: { brandConfig }
                    }]);
                await crawler.run();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async scrapeDetailPages(brandConfig, productLinks) {
        const deepCrawling = brandConfig.options?.deepCrawling;
        if (!deepCrawling?.enabled) {
            return [];
        }
        const maxProducts = deepCrawling.maxProducts || 20;
        const limitedLinks = productLinks.slice(0, maxProducts);
        console.log(`🔗 [Scraper] 將抓取 ${limitedLinks.length} 個詳細頁面`);
        const detailedData = [];
        const requestQueue = await RequestQueue.open();
        for (const link of limitedLinks) {
            await requestQueue.addRequest({
                url: link.url,
                userData: { productLink: link, brandConfig }
            });
        }
        const crawler = new PlaywrightCrawler({
            requestQueue,
            maxRequestsPerMinute: 5,
            maxConcurrency: 2,
            async requestHandler({ request, page }) {
                const productLink = request.userData.productLink;
                try {
                    console.log(`📖 [Scraper] 抓取詳細頁面: ${productLink.title}`);
                    await page.waitForLoadState('networkidle');
                    const waitTime = deepCrawling.detailPageWaitFor || 2000;
                    await page.waitForTimeout(waitTime);
                    const detailHtmlContent = await page.content();
                    const detailMarkdownContent = htmlToMarkdown(detailHtmlContent);
                    const pageImages = await extractPageImages(page, brandConfig);
                    detailedData.push({
                        productLink: {
                            ...productLink,
                            imageUrl: pageImages.length > 0 ? pageImages[0] : productLink.imageUrl
                        },
                        detailHtmlContent,
                        detailMarkdownContent,
                        scrapedAt: new Date()
                    });
                    console.log(`✅ [Scraper] 詳細頁面完成: ${productLink.title}`);
                }
                catch (error) {
                    console.warn(`⚠️ [Scraper] 詳細頁面失敗 ${productLink.url}:`, error);
                }
            },
            failedRequestHandler({ request }) {
                const productLink = request.userData.productLink;
                console.error(`❌ [Scraper] 詳細頁面請求失敗: ${productLink?.url}`);
            }
        });
        await crawler.run();
        await requestQueue.drop();
        console.log(`📚 [Scraper] 詳細頁面抓取完成: ${detailedData.length}/${limitedLinks.length}`);
        return detailedData;
    }
    async parseWithoutDeepCrawling(brandConfig, scrapedData) {
        const tokenCount = estimateTokenCount(scrapedData.markdownContent);
        console.log(`📊 [Scraper] ${brandConfig.displayName} 內容估計 Token 數: ${tokenCount}`);
        const parseResult = await this.aiParser.parseProducts({
            brandName: brandConfig.name,
            listMarkdownContent: scrapedData.markdownContent,
            sourceUrl: scrapedData.url
        });
        return {
            brand: {
                name: brandConfig.name,
                displayName: brandConfig.displayName,
                category: brandConfig.category,
                url: brandConfig.url
            },
            productsCount: parseResult.products.length,
            products: parseResult.products,
            status: parseResult.success ? 'success' : 'failed',
            errorMessage: parseResult.errorMessage,
            executionTime: 0,
            scrapedAt: new Date()
        };
    }
    async parseWithImageBasedLinks(brandConfig, scrapedData) {
        const allProducts = [];
        for (const productLink of scrapedData.productLinks || []) {
            if (!productLink.imageUrl)
                continue;
            try {
                const detailMarkdownContent = `
# ${productLink.title}

## 產品圖片
![產品圖片](${productLink.imageUrl})

## 產品資訊
- 產品名稱: ${productLink.title}
- 圖片URL: ${productLink.imageUrl}
- 是否新品: ${productLink.isNew ? '是' : '否'}
- 來源頁面: ${productLink.url}

這是一個7-Eleven的新品食品，圖片顯示了產品的外觀。
        `.trim();
                const parseRequest = {
                    brandName: brandConfig.name,
                    listMarkdownContent: scrapedData.markdownContent,
                    detailMarkdownContent: detailMarkdownContent,
                    productLink: productLink,
                    sourceUrl: productLink.url
                };
                const parseResult = await this.aiParser.parseProducts(parseRequest);
                if (parseResult.success && parseResult.products.length > 0) {
                    const productsWithImages = parseResult.products.map(product => ({
                        ...product,
                        imageUrl: product.imageUrl || productLink.imageUrl
                    }));
                    allProducts.push(...productsWithImages);
                }
                else {
                    console.warn(`⚠️ [Scraper] ${productLink.title} AI 解析失敗`);
                }
                await delay(1000);
            }
            catch (error) {
                console.error(`❌ [Scraper] ${productLink.title} 解析錯誤:`, error);
            }
        }
        const uniqueProducts = removeDuplicateProducts(allProducts);
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
            executionTime: 0,
            scrapedAt: new Date()
        };
    }
    async parseWithDeepCrawling(brandConfig, scrapedData, detailedData) {
        const allProducts = [];
        for (const detail of detailedData) {
            try {
                const parseRequest = {
                    brandName: brandConfig.name,
                    listMarkdownContent: scrapedData.markdownContent,
                    detailMarkdownContent: detail.detailMarkdownContent,
                    productLink: detail.productLink,
                    sourceUrl: detail.productLink.url
                };
                const parseResult = await this.aiParser.parseProducts(parseRequest);
                if (parseResult.success && parseResult.products.length > 0) {
                    allProducts.push(...parseResult.products);
                }
                else {
                    console.warn(`⚠️ [Scraper] ${detail.productLink.title} AI 解析失敗`);
                }
                await delay(1000);
            }
            catch (error) {
                console.error(`❌ [Scraper] ${detail.productLink.title} 解析錯誤:`, error);
            }
        }
        const uniqueProducts = removeDuplicateProducts(allProducts);
        return uniqueProducts;
    }
}
async function extractPageImages(page, brandConfig) {
    const deepCrawling = brandConfig.options?.deepCrawling;
    if (!deepCrawling?.productImageSelector) {
        return [];
    }
    try {
        await page.waitForTimeout(3000);
        const images = await page.$$eval(deepCrawling.productImageSelector, (imgs) => imgs.map(img => {
            const lazySrc = img.getAttribute('data-original') ||
                img.getAttribute('data-src') ||
                img.getAttribute('data-lazy-src') ||
                img.getAttribute('data-lazy') ||
                img.src;
            return lazySrc;
        }).filter(src => src &&
            src.includes('item-image') &&
            (src.includes('.jpg') || src.includes('.png')) &&
            !src.includes('giphy.gif')));
        console.log(`🖼️ [Scraper] 提取到 ${images.length} 張產品圖片`);
        return images;
    }
    catch (error) {
        console.warn(`⚠️ [Scraper] 提取頁面圖片失敗:`, error);
        return [];
    }
}
async function extractProductLinks(page, brandConfig) {
    const deepCrawling = brandConfig.options?.deepCrawling;
    if (!deepCrawling?.enabled || !deepCrawling.productLinkSelector) {
        return [];
    }
    try {
        const links = await page.$$eval(deepCrawling.productLinkSelector, (elements, config) => {
            const results = [];
            for (const element of elements.slice(0, config.maxProducts || 20)) {
                try {
                    const anchor = element.tagName === 'A' ? element : element.querySelector('a');
                    if (!anchor)
                        continue;
                    const href = anchor.getAttribute('href');
                    if (!href)
                        continue;
                    let title = '';
                    let imageUrl = '';
                    let price = '';
                    let isNew = false;
                    if (config.productTitleSelector) {
                        const titleElement = element.querySelector(config.productTitleSelector);
                        if (titleElement) {
                            title = titleElement.textContent?.trim() || '';
                        }
                    }
                    if (!title) {
                        title = anchor.textContent?.trim() || anchor.getAttribute('title') || '';
                    }
                    if (config.productImageSelector) {
                        const imgElement = element.querySelector(config.productImageSelector);
                        if (imgElement) {
                            imageUrl = imgElement.getAttribute('src') || '';
                        }
                    }
                    if (config.newBadgeSelector) {
                        const newBadge = element.querySelector(config.newBadgeSelector);
                        isNew = !!newBadge;
                    }
                    const absoluteUrl = href.startsWith('http') ? href :
                        href.startsWith('/') ? `${config.baseUrl}${href}` : `${config.baseUrl}/${href}`;
                    results.push({
                        title: title || '未命名產品',
                        url: absoluteUrl,
                        imageUrl: imageUrl || undefined,
                        price: price || undefined,
                        isNew
                    });
                }
                catch (error) {
                    console.warn('提取產品連結時發生錯誤:', error);
                }
            }
            return results;
        }, {
            maxProducts: deepCrawling.maxProducts || 20,
            productTitleSelector: deepCrawling.productTitleSelector,
            productImageSelector: deepCrawling.productImageSelector,
            newBadgeSelector: deepCrawling.newBadgeSelector,
            baseUrl: new URL(brandConfig.url).origin
        });
        return links;
    }
    catch (error) {
        console.warn(`⚠️ [Scraper] 提取產品連結失敗:`, error);
        return [];
    }
}
async function performPageActions(page, brandConfig) {
    const actions = brandConfig.options?.actions || [];
    for (const action of actions) {
        try {
            switch (action) {
                case 'scrollToBottom':
                    await page.evaluate(() => {
                        window.scrollTo(0, document.body.scrollHeight);
                    });
                    await page.waitForTimeout(2000);
                    console.log('🔄 執行滾動到底部操作');
                    break;
                case 'clickLoadMore':
                    const loadMoreSelectors = ['.load-more', '.show-more', '[data-action="load-more"]', 'button:contains("もっと見る")'];
                    for (const selector of loadMoreSelectors) {
                        try {
                            await page.click(selector);
                            await page.waitForTimeout(1500);
                            console.log(`👆 點擊載入更多按鈕: ${selector}`);
                            break;
                        }
                        catch {
                        }
                    }
                    break;
                default:
                    console.warn(`⚠️ 未知的頁面操作: ${action}`);
            }
        }
        catch (error) {
            console.warn(`⚠️ 頁面操作失敗 ${action}:`, error);
        }
    }
}
function removeDuplicateProducts(products) {
    const seen = new Set();
    return products.filter(product => {
        const key = `${product.translatedName}-${product.sourceUrl}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export function createWebScraper(aiParser) {
    return new WebScraper(aiParser);
}
//# sourceMappingURL=scraper.js.map