
import { PlaywrightCrawler } from 'crawlee';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo, ProductLink, AIParseRequest } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class SevenElevenStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        console.log(`🏪 [SevenElevenStrategy] 開始抓取 7-Eleven...`);
        const startTime = Date.now();
        let allProducts: ProductInfo[] = [];

        // 我們將使用一個變量來跟踪是否還有下一頁
        let hasNextPage = true;
        let currentPageUrl = brandConfig.url;
        let pageCount = 0;
        const MAX_PAGES = 5; // 安全限制，避免無限循環

        const crawler = new PlaywrightCrawler({
            maxRequestsPerMinute: 10,
            requestHandlerTimeoutSecs: 300, // 5 分鐘，足夠處理 AI 解析
            requestHandler: async ({ request, page }) => {
                console.log(`📄 [SevenElevenStrategy] 正在處理頁面: ${request.url}`);

                // 等待列表加載
                await page.waitForSelector('.list_inner', { timeout: 10000 }).catch(() => console.log('⚠️ 等待 .list_inner 超時'));

                // 提取當前頁面的產品連結與資訊
                const links = await this.extractProductsFromPage(page, brandConfig);
                console.log(`✅ [SevenElevenStrategy] 頁面找到 ${links.length} 個產品`);

                // ✨ 關鍵修正：先檢查分頁（頁面還活著），再執行耗時的 AI 解析
                // 用戶提示: class="pager_ctrl wide", 連結文字為［次へ］
                const nextUrl = await page.$$eval('.pager_ctrl a', (anchors: any[]) => {
                    const nextLink = anchors.find(a => a.textContent.includes('次へ'));
                    return nextLink ? nextLink.getAttribute('href') : null;
                }).catch(() => null); // 添加錯誤處理

                if (nextUrl && pageCount < MAX_PAGES) {
                    // 構建絕對路徑
                    const baseUrl = new URL(brandConfig.url).origin;
                    const absoluteNextUrl = nextUrl.startsWith('http') ? nextUrl :
                        nextUrl.startsWith('/') ? `${baseUrl}${nextUrl}` : `${baseUrl}/${nextUrl}`;

                    console.log(`➡️ [SevenElevenStrategy] 發現下一頁 (${pageCount + 1}/${MAX_PAGES}): ${absoluteNextUrl}`);
                    // 將下一頁加入隊列
                    await crawler.addRequests([absoluteNextUrl]);
                    pageCount++;
                } else {
                    console.log('⏹️ [SevenElevenStrategy] 未找到下一頁連結 (次へ) 或達到頁數限制。');
                }

                // AI解析 (放在分頁檢查後，即使耗時也不影響分頁發現)
                const products = await this.parseProducts(brandConfig, links);
                allProducts.push(...products);
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

    // 提取原始連結資料 (含 rawText 和 lazy load image)
    private async extractProductsFromPage(page: any, brandConfig: BrandConfig): Promise<ProductLink[]> {
        const baseUrl = new URL(brandConfig.url).origin;

        return await page.$$eval('.list_inner', (elements: any[], baseUrl: string) => {
            return elements.map(element => {
                const anchor = element.tagName === 'A' ? element : element.querySelector('a');
                const href = anchor?.getAttribute('href');
                if (!href) return null;

                // 標題 (.item_ttl)
                const titleElement = element.querySelector('.item_ttl');
                const title = titleElement?.textContent?.trim() || anchor?.textContent?.trim() || '';

                // 圖片 (figure img) - 處理 lazy load
                const imgElement = element.querySelector('figure img');
                let imageUrl = '';
                if (imgElement) {
                    imageUrl = imgElement.getAttribute('data-original') ||
                        imgElement.getAttribute('data-src') ||
                        imgElement.getAttribute('src') || '';
                    if (imageUrl.includes('giphy.gif')) imageUrl = '';
                }

                // 絕對路徑處理
                const absoluteUrl = href.startsWith('http') ? href :
                    href.startsWith('/') ? `${baseUrl}${href}` : `${baseUrl}/${href}`;

                if (imageUrl && !imageUrl.startsWith('http')) {
                    imageUrl = imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
                }

                // 原始文本 (用於提取價格日期)
                const rawText = element.textContent?.trim() || '';

                return {
                    title,
                    url: absoluteUrl,
                    imageUrl,
                    rawText,
                    isNew: true // 假設列表頁的都是新品
                };
            }).filter((item: any) => item !== null);
        }, baseUrl);
    }

    // 使用 AI 解析 (List-Only 模式)
    private async parseProducts(brandConfig: BrandConfig, links: ProductLink[]): Promise<ProductInfo[]> {
        const results: ProductInfo[] = [];

        for (const link of links) {
            // AI 解析
            const contentText = link.rawText || `Product: ${link.title}`;
            try {
                const parseRequest: AIParseRequest = {
                    brandName: brandConfig.name,
                    listMarkdownContent: contentText,
                    productLink: link,
                    sourceUrl: link.url
                };

                // 這裡可以加上簡單的快取或延遲
                await new Promise(resolve => setTimeout(resolve, 200));

                const aiResult = await this.aiParser.parseProducts(parseRequest);

                if (aiResult.success && aiResult.products.length > 0) {
                    const p = aiResult.products[0];
                    results.push({
                        ...p,
                        originalName: link.title, // 強制使用 selector 抓到的標題
                        imageUrl: link.imageUrl || p.imageUrl, // 優先使用 selector 抓到的
                        sourceUrl: link.url
                    });
                } else {
                    // Fallback
                    results.push({
                        originalName: link.title,
                        translatedName: link.title,
                        imageUrl: link.imageUrl,
                        sourceUrl: link.url,
                        isNew: true,
                        description: link.rawText
                    } as any);
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
            const nameKey = product.originalName || product.translatedName;
            const key = `${nameKey}-${product.sourceUrl}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
