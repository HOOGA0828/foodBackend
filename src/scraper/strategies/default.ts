
import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScrapedData, ScraperResult, ProductInfo, ProductLink, DetailedProductData, AIParseRequest } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';
import { htmlToMarkdown, estimateTokenCount } from '../../utils/htmlCleaner.js';

export class DefaultStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        const startTime = Date.now();
        try {
            console.log(`🕷️ [DefaultStrategy] 開始第一階段：抓取 ${brandConfig.displayName} 列表頁面`);
            const scrapedData = await this.scrapeListPage(brandConfig);

            if (!scrapedData.productLinks || scrapedData.productLinks.length === 0) {
                console.log(`⚠️ [DefaultStrategy] ${brandConfig.displayName} 未找到產品連結`);
                return this.parseWithoutDeepCrawling(brandConfig, scrapedData); // Fallback
            }

            const hasImageBasedLinks = scrapedData.productLinks?.some(link =>
                link.url === scrapedData.url && link.imageUrl
            );

            if (hasImageBasedLinks) {
                console.log(`🖼️ [DefaultStrategy] ${brandConfig.displayName} 檢測到基於圖片的連結，使用特殊解析模式`);
                return await this.parseWithImageBasedLinks(brandConfig, scrapedData);
            }

            // Phase 2: Deep Crawl
            const shouldScrapeDetails = brandConfig.options?.deepCrawling?.enabled &&
                brandConfig.options?.deepCrawling?.scrapeDetailPages !== false;

            let products: ProductInfo[] = [];

            if (shouldScrapeDetails) {
                console.log(`🔍 [DefaultStrategy] 開始第二階段：深度抓取 ${brandConfig.displayName} 詳細頁面`);
                const detailedData = await this.scrapeDetailPages(brandConfig, scrapedData.productLinks);
                console.log(`🤖 [DefaultStrategy] 開始第三階段：解析 ${brandConfig.displayName} (詳細頁面模式)`);
                products = await this.parseWithDeepCrawling(brandConfig, scrapedData, detailedData);
            } else {
                console.log(`🤖 [DefaultStrategy] 開始第三階段：解析 ${brandConfig.displayName} (列表頁面模式)`);
                products = await this.parseWithListLinks(brandConfig, scrapedData.productLinks);
            }

            const executionTime = Date.now() - startTime;
            return {
                brand: { name: brandConfig.name, displayName: brandConfig.displayName, category: brandConfig.category, url: brandConfig.url },
                productsCount: products.length,
                products,
                status: 'success',
                executionTime,
                scrapedAt: new Date()
            };

        } catch (error) {
            console.error(`❌ [DefaultStrategy] 抓取失敗:`, error);
            return {
                brand: { name: brandConfig.name, displayName: brandConfig.displayName, category: brandConfig.category, url: brandConfig.url },
                productsCount: 0,
                products: [],
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : '未知錯誤',
                executionTime: Date.now() - startTime,
                scrapedAt: new Date()
            };
        }
    }

    // --- Implementation Methods ---

    private async scrapeListPage(brandConfig: BrandConfig): Promise<ScrapedData> {
        return new Promise(async (resolve, reject) => {
            try {
                const crawler = new PlaywrightCrawler({
                    maxRequestsPerMinute: 10,
                    maxConcurrency: 1,
                    requestHandler: async ({ request, page }) => {
                        await page.waitForLoadState('domcontentloaded');
                        await this.performPageActions(page, brandConfig);
                        const waitTime = brandConfig.options?.waitFor || 1000;
                        await page.waitForTimeout(waitTime);

                        let targetHtml = await page.content();
                        if (brandConfig.newProductSelector) {
                            try {
                                await page.waitForSelector(brandConfig.newProductSelector, { timeout: 10000 });
                                const el = await page.$(brandConfig.newProductSelector);
                                if (el) targetHtml = await el.innerHTML();
                            } catch (e) {
                                console.warn(`⚠️ [Scraper] 無法找到新品選擇器 ${brandConfig.newProductSelector}`);
                            }
                        }

                        let productLinks = await this.extractProductLinks(page, brandConfig);
                        if (!productLinks.length) {
                            const images = await this.extractPageImages(page, brandConfig);
                            if (images.length > 0) {
                                productLinks = images.map((url, i) => ({
                                    title: `Product ${i + 1}`,
                                    url: request.url,
                                    imageUrl: url,
                                    isNew: true
                                }));
                            }
                        }

                        resolve({
                            brandName: brandConfig.name,
                            url: request.url,
                            scrapedAt: new Date(),
                            htmlContent: targetHtml,
                            markdownContent: htmlToMarkdown(targetHtml),
                            productLinks
                        });
                    },
                    failedRequestHandler: ({ request }) => reject(new Error(`Failed ${request.url}`))
                });
                await crawler.run([brandConfig.url]);
            } catch (e) { reject(e); }
        });
    }

    private async scrapeDetailPages(brandConfig: BrandConfig, links: ProductLink[]): Promise<DetailedProductData[]> {
        const detailedData: DetailedProductData[] = [];
        const deepCrawling = brandConfig.options?.deepCrawling;
        if (!deepCrawling?.enabled) return [];

        const queue = await RequestQueue.open();
        const limitedLinks = links.slice(0, deepCrawling.maxProducts || 20);
        for (const link of limitedLinks) await queue.addRequest({ url: link.url, userData: { link, brandConfig } });

        const crawler = new PlaywrightCrawler({
            requestQueue: queue,
            maxRequestsPerMinute: 5,
            maxConcurrency: 2,
            requestHandler: async ({ request, page }) => {
                const link = request.userData.link as ProductLink;
                await page.waitForLoadState('domcontentloaded');
                await page.waitForTimeout(deepCrawling.detailPageWaitFor || 2000);
                const content = await page.content();
                // Image extraction from detail
                const images = await this.extractPageImages(page, brandConfig);
                detailedData.push({
                    productLink: { ...link, imageUrl: images[0] || link.imageUrl },
                    detailHtmlContent: content,
                    detailMarkdownContent: htmlToMarkdown(content),
                    scrapedAt: new Date()
                });
            },
            failedRequestHandler: ({ request }) => console.error(`Failed detail: ${request.url}`)
        });
        await crawler.run();
        await queue.drop();
        return detailedData;
    }

    // --- Extraction Helpers ---

    private async extractProductLinks(page: any, brandConfig: BrandConfig): Promise<ProductLink[]> {
        const deep = brandConfig.options?.deepCrawling;
        if (!deep?.enabled || !deep.productLinkSelector) return [];

        return await page.$$eval(deep.productLinkSelector, (els: any[], conf: any) => {
            return els.slice(0, conf.maxProducts).map(el => {
                const a = el.tagName === 'A' ? el : el.querySelector('a');
                if (!a) return null;
                const href = a.getAttribute('href');
                if (!href) return null;

                let title = '';
                if (conf.titleSel) title = el.querySelector(conf.titleSel)?.textContent?.trim();
                if (!title) title = a.textContent?.trim() || a.getAttribute('title') || '';

                let imgUrl = '';
                if (conf.imgSel) {
                    const img = el.querySelector(conf.imgSel);
                    if (img) {
                        // 處理 lazy loading: 優先檢查 data-original, data-src, 最後才用 src
                        imgUrl = img.getAttribute('data-original') ||
                            img.getAttribute('data-src') ||
                            img.getAttribute('src') || '';
                        // 過濾掉預覽圖/佔位圖
                        if (imgUrl.includes('giphy.gif') || imgUrl.includes('placeholder')) {
                            imgUrl = '';
                        }
                    }
                }

                const absUrl = href.startsWith('http') ? href : href.startsWith('/') ? `${conf.baseUrl}${href}` : `${conf.baseUrl}/${href}`;
                const raw = el.textContent?.trim() || '';

                return { title: title || 'No Name', url: absUrl, imageUrl: imgUrl, rawText: raw, isNew: !!el.querySelector(conf.newSel) };
            }).filter(i => i !== null);
        }, {
            maxProducts: deep.maxProducts || 20,
            titleSel: deep.productTitleSelector,
            imgSel: deep.productImageSelector,
            newSel: deep.newBadgeSelector,
            baseUrl: new URL(brandConfig.url).origin
        });
    }

    private async extractPageImages(page: any, brandConfig: BrandConfig): Promise<string[]> {
        const sel = brandConfig.options?.deepCrawling?.productImageSelector;
        if (!sel) return [];
        return await page.$$eval(sel, (imgs: any[]) =>
            imgs.map(i => i.getAttribute('data-original') ||
                i.getAttribute('data-src') ||
                i.src || '')
                .filter(s => s && !s.includes('giphy.gif') && !s.includes('placeholder'))
        );
    }

    private async performPageActions(page: any, brandConfig: BrandConfig) {
        const actions = brandConfig.options?.actions || [];

        for (const action of actions) {
            if (action === 'scrollToBottom') {
                console.log('🔄 [Scraper] 開始滾動頁面以觸發 lazy loading...');

                // 先滾動到最頂部
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.waitForTimeout(500);

                // 獲取頁面高度
                const pageHeight = await page.evaluate(() => document.body.scrollHeight);
                const viewportHeight = await page.evaluate(() => window.innerHeight);

                // 計算需要滾動的次數
                const scrollSteps = Math.ceil(pageHeight / viewportHeight) + 2;
                console.log(`📏 [Scraper] 頁面高度: ${pageHeight}px, 視窗高度: ${viewportHeight}px, 將滾動 ${scrollSteps} 次`);

                // 逐步滾動，每次一個視窗高度
                for (let i = 0; i < scrollSteps; i++) {
                    await page.evaluate(() => {
                        window.scrollBy({
                            top: window.innerHeight,
                            behavior: 'smooth'
                        });
                    });

                    // 每次滾動後等待較長時間讓圖片載入
                    await page.waitForTimeout(1500);
                    console.log(`   滾動進度: ${i + 1}/${scrollSteps}`);
                }

                // 最後滾到最底部確保萬無一失
                await page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await page.waitForTimeout(2000); // 最後多等2秒

                console.log('✅ [Scraper] 滾動完成');
            }
        }
    }

    // --- Parsing Helpers ---

    private async parseWithListLinks(brandConfig: BrandConfig, links: ProductLink[]): Promise<ProductInfo[]> {
        // Logic similar to what we had in scraper.ts
        const results: ProductInfo[] = [];
        for (const link of links) {
            const res = await this.aiParser.parseProducts({
                brandName: brandConfig.name,
                listMarkdownContent: link.rawText || link.title,
                productLink: link,
                sourceUrl: link.url
            });
            if (res.success) {
                // 優先使用 HTML selector 抓到的圖片，而非 AI 推測的
                const productsWithCorrectImages = res.products.map(p => ({
                    ...p,
                    imageUrl: link.imageUrl || p.imageUrl, // HTML 優先
                    sourceUrl: link.url
                }));
                results.push(...productsWithCorrectImages);
            }
        }
        return this.removeDuplicateProducts(results);
    }

    private async parseWithoutDeepCrawling(brandConfig: BrandConfig, data: ScrapedData): Promise<ScraperResult> {
        const res = await this.aiParser.parseProducts({ brandName: brandConfig.name, listMarkdownContent: data.markdownContent, sourceUrl: data.url });
        return {
            brand: { name: brandConfig.name, displayName: brandConfig.displayName, category: brandConfig.category, url: brandConfig.url },
            productsCount: res.products.length,
            products: res.products,
            status: 'success',
            executionTime: 0,
            scrapedAt: new Date()
        };
    }

    private async parseWithDeepCrawling(brandConfig: BrandConfig, scrapedData: ScrapedData, detailedData: DetailedProductData[]): Promise<ProductInfo[]> {
        const all: ProductInfo[] = [];
        for (const d of detailedData) {
            const res = await this.aiParser.parseProducts({
                brandName: brandConfig.name,
                listMarkdownContent: scrapedData.markdownContent,
                detailMarkdownContent: d.detailMarkdownContent,
                productLink: d.productLink,
                sourceUrl: d.productLink.url
            });
            if (res.success) {
                // 優先使用 HTML 抓到的圖片
                const productsWithCorrectImages = res.products.map(p => ({
                    ...p,
                    imageUrl: d.productLink.imageUrl || p.imageUrl,
                    sourceUrl: d.productLink.url
                }));
                all.push(...productsWithCorrectImages);
            }
        }
        return this.removeDuplicateProducts(all);
    }

    private async parseWithImageBasedLinks(brandConfig: BrandConfig, data: ScrapedData): Promise<ScraperResult> {
        return await this.parseWithoutDeepCrawling(brandConfig, data); // Fallback for simplicity
    }

    private removeDuplicateProducts(products: ProductInfo[]): ProductInfo[] {
        const seen = new Set<string>();
        return products.filter(product => {
            const nameKey = product.originalName || product.translatedName;
            const key = `${nameKey}-${product.sourceUrl}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
