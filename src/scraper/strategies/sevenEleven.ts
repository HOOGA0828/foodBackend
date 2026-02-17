
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

    // 使用 AI 批次解析 (優化版)
    private async parseProducts(brandConfig: BrandConfig, links: ProductLink[]): Promise<ProductInfo[]> {
        if (links.length === 0) return [];

        const BATCH_SIZE = 10; // 每批處理 10 個產品
        const batches: ProductLink[][] = [];

        // 分批
        for (let i = 0; i < links.length; i += BATCH_SIZE) {
            batches.push(links.slice(i, i + BATCH_SIZE));
        }

        console.log(`📦 [SevenElevenStrategy] 將 ${links.length} 個產品分為 ${batches.length} 批次處理`);

        // 並行處理多個批次 (限制 2 個並行，避免 API 過載)
        const pLimit = (await import('p-limit')).default;
        const limit = pLimit(2);

        const batchResults = await Promise.all(
            batches.map((batch, idx) =>
                limit(async () => {
                    console.log(`🔄 [SevenElevenStrategy] 處理批次 ${idx + 1}/${batches.length}...`);
                    return this.processBatch(brandConfig, batch);
                })
            )
        );

        return batchResults.flat();
    }

    // 批次處理輔助方法
    private async processBatch(brandConfig: BrandConfig, links: ProductLink[]): Promise<ProductInfo[]> {
        const requests: AIParseRequest[] = links.map(link => ({
            brandName: brandConfig.name,
            listMarkdownContent: link.rawText || `Product: ${link.title}`,
            productLink: link,
            sourceUrl: link.url
        }));

        try {
            const parsedProducts = await this.aiParser.parseProductsBatch(requests);

            // 合併 HTML 提取的資訊
            return parsedProducts.map((p, idx) => {
                const link = links[idx];
                if (!link) return p; // 安全檢查

                return {
                    ...p,
                    translatedName: p.translatedName || p.originalName || link.title,
                    originalName: link.title,
                    imageUrl: link.imageUrl || p.imageUrl || '',
                    sourceUrl: link.url
                };
            });

        } catch (error) {
            console.error('❌ [SevenElevenStrategy] 批次處理失敗，使用 fallback:', error);
            // Fallback: 回傳基本資訊
            return links.map(link => ({
                originalName: link.title,
                translatedName: link.title,
                imageUrl: link.imageUrl,
                sourceUrl: link.url,
                isNew: true,
                description: link.rawText
            } as any));
        }
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
