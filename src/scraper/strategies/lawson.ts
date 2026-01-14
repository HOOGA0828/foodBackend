
import { PlaywrightCrawler } from 'crawlee';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo, ProductLink, AIParseRequest } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class LawsonStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        console.log(`🏪 [LawsonStrategy] 開始抓取 Lawson (最近3個日期)...`);
        const startTime = Date.now();
        let allProducts: ProductInfo[] = [];

        // 追蹤已發現的目標日期 URL
        const targetUrls = new Set<string>();
        let datesDiscovered = false;

        const crawler = new PlaywrightCrawler({
            maxRequestsPerMinute: 10,
            requestHandler: async ({ request, page }) => {
                console.log(`📄 [LawsonStrategy] 正在處理頁面: ${request.url}`);

                // 1. 檢測並提取日期導航 (僅在尚未發現時執行)
                // Redirect 可能發生，所以我們要在任何頁面上檢查 contentsNav
                const navExists = await page.locator('.contentsNav').count() > 0;

                if (navExists && !datesDiscovered) {
                    console.log('📅 [LawsonStrategy] 發現 contentsNav，正在提取日期...');

                    // 提取所有日期連結
                    const dateLinks = await page.$$eval('.contentsNav li a', (anchors: HTMLElement[]) => {
                        return anchors.map(a => ({
                            text: a.textContent?.trim() || '',
                            href: a.getAttribute('href')
                        })).filter(link => link.href && link.text.includes('発売'));
                    });

                    console.log(`📅 [LawsonStrategy] 找到 ${dateLinks.length} 個日期連結`);

                    // 取最近的 3 個日期
                    const top3Links = dateLinks.slice(0, 3);

                    const baseUrl = new URL(brandConfig.url).origin;
                    for (const link of top3Links) {
                        if (link.href) {
                            const absoluteUrl = link.href.startsWith('http') ? link.href :
                                link.href.startsWith('/') ? `${baseUrl}${link.href}` : `${baseUrl}/${link.href}`;

                            console.log(`🎯 [LawsonStrategy] 加入目標日期頁面: ${link.text} -> ${absoluteUrl}`);
                            targetUrls.add(absoluteUrl);

                            // 加入佇列 (如果不是當前頁面)
                            if (absoluteUrl !== request.url) {
                                await crawler.addRequests([absoluteUrl]);
                            }
                        }
                    }
                    datesDiscovered = true;
                }

                // 2. 爬取產品
                // 只有當前頁面是目標 URL 之一，或是初始入口頁面 (可能被 redirect 到目標頁) 時才爬取
                // 為了保險，只要頁面上有產品列表，我們就嘗試爬取 (並依靠去重)

                // 等待產品列表元素 (Lawson 結構通常包含 .col-2, .col-3, 或 .list_inner)
                // 我們使用一個寬鬆的等待，如果超時也不報錯 (可能該頁面無產品)
                try {
                    await page.waitForSelector('.col-2, .col-3, .list_inner, .recommendList', { timeout: 5000 });
                } catch (e) {
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

        // 去重
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

    private async extractProductsFromPage(page: any, brandConfig: BrandConfig): Promise<ProductLink[]> {
        const baseUrl = new URL(brandConfig.url).origin;

        // Lawson 產品列表選擇器策略
        // 嘗試多種常見結構
        const selector = '.col-2 li, .col-3 li, .recommendList li, .list_inner';

        return await page.$$eval(selector, (elements: HTMLElement[], baseUrl: string) => {
            return elements.map(element => {
                const anchor = element.querySelector('a');
                const href = anchor?.getAttribute('href');
                if (!href) return null;

                // 排除非產品連結 (例如 "回列表" 等)
                if (href.includes('index.html') && !href.includes('detail')) return null;

                // 標題
                const titleElement = element.querySelector('.ttl, .item-title, .product-name, p.text');
                const title = titleElement?.textContent?.trim() || anchor?.textContent?.trim() || '';

                // 圖片
                const imgElement = element.querySelector('img');
                let imageUrl = '';
                if (imgElement) {
                    imageUrl = imgElement.getAttribute('src') || '';
                }

                // 價格
                const priceElement = element.querySelector('.price, .item-price');
                const priceText = priceElement?.textContent?.trim() || '';

                // 絕對路徑處理
                const absoluteUrl = href.startsWith('http') ? href :
                    href.startsWith('/') ? `${baseUrl}${href}` : `${baseUrl}/${href}`;

                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
                }

                // 原始文本
                const rawText = element.textContent?.trim() || '';

                return {
                    title,
                    url: absoluteUrl,
                    imageUrl,
                    rawText: `${rawText} ${priceText}`, // 把價格加進去幫助 AI 解析
                    isNew: true
                };
            }).filter((item: any) => item !== null && item.title.length > 0);
        }, baseUrl);
    }

    private async parseProducts(brandConfig: BrandConfig, links: ProductLink[]): Promise<ProductInfo[]> {
        const results: ProductInfo[] = [];

        for (const link of links) {
            // 由於 Lawson 產品可能是列表式的，我們使用 AI 來提取細節
            const contentText = link.rawText || `Product: ${link.title}`;
            try {
                const parseRequest: AIParseRequest = {
                    brandName: brandConfig.name,
                    listMarkdownContent: contentText,
                    productLink: link,
                    sourceUrl: link.url
                };

                // Rate limiting
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
                } else {
                    const fallbackProduct: ProductInfo = {
                        originalName: link.title,
                        translatedName: link.title,
                        imageUrl: link.imageUrl,
                        sourceUrl: link.url,
                        isNew: true,
                        originalDescription: link.rawText
                    };
                    results.push(fallbackProduct);
                }
            } catch (e) {
                console.error(`解析失敗 ${link.title}:`, e);
            }
        }
        return results;
    }

    private removeDuplicateProducts(products: ProductInfo[]): ProductInfo[] {
        const seen = new Set<string>();
        return products.filter(product => {
            const key = `${product.originalName}-${product.sourceUrl}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
