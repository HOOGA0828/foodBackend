import { chromium } from 'playwright';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo, ProductLink, AIParseRequest } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class YoshinoyaStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        const startTime = Date.now();
        console.log(`🏪 [Yoshinoya] 開始抓取: ${brandConfig.displayName}`);

        let browser = null;
        try {
            browser = await chromium.launch();
            const page = await browser.newPage();

            // 1. 抓取首頁 Banner 連結
            const scannedLinks = await this.scrapeCarouselLinks(page, brandConfig.url);
            console.log(`🔗 [Yoshinoya] 找到 ${scannedLinks.length} 個 AI 驗證通過的連結`);

            if (scannedLinks.length === 0) {
                console.warn('⚠️ 未找到連結，可能選擇器失效或目前沒有促銷 Banner');
            }

            // 2. 抓取詳細頁面
            console.log(`🔍 [Yoshinoya] 開始深度抓取 ${scannedLinks.length} 個頁面...`);
            const products = await this.scrapeDetailPages(browser, scannedLinks, brandConfig);

            // 3. 關閉瀏覽器
            await browser.close();
            browser = null;

            // 4. 去重
            const uniqueProducts = this.deduplicateProducts(products);

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
                status: uniqueProducts.length > 0 ? 'success' : 'partial_success',
                executionTime,
                scrapedAt: new Date()
            };

        } catch (error) {
            console.error(`❌ [Yoshinoya] 抓取失敗:`, error);
            if (browser) await browser.close();
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

    private async scrapeCarouselLinks(page: any, url: string): Promise<ProductLink[]> {
        console.log(`Visiting: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

        // 等待 .campaign__unit ... 載入
        try {
            await page.waitForSelector('.campaign__unit .swiper-wrapper', { timeout: 10000 });
        } catch (e) {
            console.warn('⚠️ 找不到 .campaign__unit .swiper-wrapper，嘗試繼續執行...');
        }

        // 提取所有候選項目
        // 吉野家 Campaign Banner
        const rawItems = await page.$$eval('.campaign__unit .swiper-slide:not(.swiper-slide-duplicate)', (els: HTMLElement[]) => {
            const seen = new Set<string>();
            return els.map(el => {
                const anchor = el.querySelector('a');
                const img = el.querySelector('img');
                const imgSrc = img?.getAttribute('src') || '';

                // 嘗試多種方式獲取標題
                const textEl = el.querySelector('.rcmd__text p, .rcmd__text, .camp__text p');
                const text = textEl?.textContent || img?.getAttribute('alt') || anchor?.innerText || '';

                // 排除無連結或無圖片的項目
                if (!anchor || !imgSrc || seen.has(imgSrc)) return null;
                seen.add(imgSrc);

                return {
                    url: anchor.href,
                    text: text.trim(),
                    imgSrc: imgSrc
                };
            }).filter(i => i !== null && i.url);
        });

        console.log(`🔎 找到 ${rawItems.length} 個輪播項目，開始 AI 視覺篩選...`);

        const links: ProductLink[] = [];

        for (const item of rawItems) {
            // 確保圖片 URL 是完整的
            let validImg = item.imgSrc;
            if (validImg.startsWith('/')) {
                validImg = new URL(validImg, url).href;
            }

            // 使用 AI 判斷是否為食物廣告
            // 避免頻率限制
            await new Promise(r => setTimeout(r, 500));

            const isFood = await this.aiParser.isFoodAdvertisement(validImg);

            if (isFood) {
                console.log(`✅ [AI] 廣告視為食物: ${item.text || '無標題'}`);
                console.log(`   連結: ${item.url}`);

                links.push({
                    title: item.text,
                    url: item.url,
                    imageUrl: validImg,
                    isNew: true
                });
            } else {
                console.log(`❌ [AI] 廣告視為非食物: ${item.text || '無標題'}`);
            }
        }
        return links;
    }

    private async scrapeDetailPages(browser: any, links: ProductLink[], brandConfig: BrandConfig): Promise<ProductInfo[]> {
        const products: ProductInfo[] = [];
        const page = await browser.newPage();

        // 限制抓取數量
        const targets = links.slice(0, 10);

        for (const link of targets) {
            try {
                console.log(`📄 解析產品頁面: ${link.url}`);
                await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // 抓取頁面內容轉換為 Markdown
                const contentMarkdown = await page.evaluate(`(() => {
                    const header = document.querySelector('header');
                    const footer = document.querySelector('footer');
                    if (header) header.style.display = 'none';
                    if (footer) footer.style.display = 'none';

                    function walker(node) {
                        if (node.nodeType === 3) {
                            return (node.textContent ? node.textContent.trim() : '') + ' ';
                        }
                        if (node.nodeType === 1) {
                            const el = node;
                            if (el.style && (el.style.display === 'none' || el.style.visibility === 'hidden')) return '';
                            
                            const tagName = el.tagName.toLowerCase();
                            if (tagName === 'img') {
                                const src = el.src;
                                const alt = el.alt || 'Product Image';
                                if (src && el.width > 50 && el.height > 50) return '\\n![' + alt + '](' + src + ')\\n';
                                return '';
                            }
                            
                            let text = '';
                            for (let i = 0; i < el.childNodes.length; i++) {
                                text += walker(el.childNodes[i]);
                            }
                            
                            if (['div', 'p', 'br', 'li', 'h1', 'h2', 'h3', 'section', 'article', 'tr'].includes(tagName)) {
                                text += '\\n';
                            }
                            return text;
                        }
                        return '';
                    }
                    return walker(document.body);
                })()`);

                // AI 解析
                await new Promise(r => setTimeout(r, 1000));
                console.log(`🧠 [Yoshinoya] 呼叫 AI 解析頁面內容...`);

                const parseRequest: AIParseRequest = {
                    brandName: brandConfig.name,
                    listMarkdownContent: contentMarkdown,
                    sourceUrl: link.url
                };

                const aiResult = await this.aiParser.parseProducts(parseRequest);

                if (aiResult.success) {
                    for (const p of aiResult.products) {
                        // 後處理過濾與翻譯
                        const original = p.originalName || '';

                        // 1. 區域限定與單品過濾
                        const desc = (p.originalDescription || '') + (p.translatedDescription || '');
                        if (desc.includes('区域限定') || desc.includes('地域限定') || desc.includes('エリア限定') ||
                            original.includes('單品') || original.includes('単品')) {
                            console.log(`🚫 [Filter] 排除單品/區域限定: ${p.translatedName} (${original})`);
                            continue;
                        }

                        // 判斷是否應該排除 (基於原始名稱判定是否為區域限定，有些可能沒寫在描述)
                        // 通常吉野家官網會在標題寫 [地域限定] 或類似
                        if (original.match(/\[.*(限定).+\]/)) {
                            // 簡單正則檢查
                            if (original.includes('地域') || original.includes('北海道') || original.includes('関東') || original.includes('関西')) {
                                console.log(`🚫 [Filter] 排除區域限定產品: ${original}`);
                                continue;
                            }
                        }

                        // 2. 翻譯名稱為中文 (AI Parser 已經盡量翻譯，這裡只要確保 translatedName 是中文)
                        // 如果 AI Parser 回傳的 translatedName 仍是日文，通常是因為 prompt 沒強調
                        // 不過 AIParserService 預設就是翻譯成中文，所以這裡信任 AIResult

                        // 3. 確保 originalName 是日文
                        // AI Parser 會保留 originalName

                        products.push({
                            ...p,
                            // 圖片優先使用內頁解析到的，若無則用 Banner 圖
                            imageUrl: p.imageUrl ? (p.imageUrl.startsWith('http') ? p.imageUrl : new URL(p.imageUrl, link.url).href) : link.imageUrl,
                            sourceUrl: link.url,
                            isNew: true
                        });

                        console.log(`   + [${p.originalName}] -> ${p.translatedName} (${p.price?.amount || '??'} JPY)`);
                    }
                }

            } catch (e) {
                console.error(`Failed to parse page ${link.url}:`, e);
            }
        }
        await page.close();
        return products;
    }

    private deduplicateProducts(products: ProductInfo[]): ProductInfo[] {
        const seen = new Set<string>();
        return products.filter(p => {
            const key = `${p.originalName}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
