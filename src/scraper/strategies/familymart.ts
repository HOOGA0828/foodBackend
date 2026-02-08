import { chromium } from 'playwright';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo, ProductLink } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class FamilyMartStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        const startTime = Date.now();
        console.log(`🏪 [FamilyMart] 開始抓取: ${brandConfig.displayName}`);

        let browser = null;
        try {
            browser = await chromium.launch();
            const page = await browser.newPage();

            // 1. 抓取列表頁
            const scannedLinks = await this.scrapeCarouselLinks(page, brandConfig.url);
            console.log(`🔗 [FamilyMart] 找到 ${scannedLinks.length} 個 AI 驗證通過的商品連結`);

            if (scannedLinks.length === 0) {
                console.warn('⚠️ 未找到連結，可能選擇器失效或頁面無符合條件的廣告');
            }

            // 2. 抓取詳細頁面
            console.log(`🔍 [FamilyMart] 開始深度抓取 ${scannedLinks.length} 個頁面...`);
            const products = await this.scrapeDetailPages(browser, scannedLinks);

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
            console.error(`❌ [FamilyMart] 抓取失敗:`, error);
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

        try {
            await page.waitForSelector('.responsive_carousel_module_wrapper', { timeout: 10000 });
        } catch (e) {
            console.warn('⚠️ 找不到 .responsive_carousel_module_wrapper，嘗試直接尋找連結...');
        }

        // 提取所有候選項目 (模仿 test-carousel-filtering.ts 的邏輯)
        const rawItems = await page.$$eval('.responsive_carousel_module_wrapper .splide__slide', (els: HTMLElement[]) => {
            const seen = new Set<string>();
            return els.map(el => {
                const anchor = el.querySelector('a');
                const img = el.querySelector('img');
                const imgSrc = img?.src || '';

                // 初步去重與過濾
                if (!imgSrc || seen.has(imgSrc)) return null;
                seen.add(imgSrc);

                return {
                    url: anchor?.href || '',
                    text: anchor?.innerText?.trim() || '',
                    imgSrc: imgSrc,
                    html: el.outerHTML
                };
            }).filter(i => i !== null && i.url); // 必須有連結
        });

        console.log(`🔎 找到 ${rawItems.length} 個不重複的輪播項目，開始 AI 視覺篩選...`);

        const links: ProductLink[] = [];

        for (const item of rawItems) {
            // 為了節省 Token，還是可以排除明顯的非商品 (如 campaign 且文字明確非食物)
            // 但主要依賴 AI

            // 處理圖片 URL
            let validImg = item.imgSrc;
            if (validImg.startsWith('/')) {
                validImg = new URL(validImg, url).href;
            }

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

    private async scrapeDetailPages(browser: any, links: ProductLink[]): Promise<ProductInfo[]> {
        const products: ProductInfo[] = [];
        const targets = links.slice(0, 10); // Limit to avoid timeout

        const page = await browser.newPage();

        for (const link of targets) {
            try {
                console.log(`📄 Scanning Campaign Page: ${link.url}`);
                await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                // Scroll down to trigger lazy loading
                await page.evaluate(async () => {
                    for (let i = 0; i < 5; i++) {
                        window.scrollBy(0, 1000);
                        await new Promise(r => setTimeout(r, 500));
                    }
                });

                // Extract using Geometric Proximity
                // We inject the function code as a string since we can't pass the function reference directly if it has imports
                // But for now, since it's simple, we can copy-paste or assume it's available.
                // To keep it robust within Playwright's evaluate, we'll inline the logic but cleaner.

                const pageProducts = await page.evaluate(() => {
                    // Optimized Geometric Scraper Logic
                    const priceRegex = /(\d{1,3}(,\d{3})*)円/;
                    const allEls = Array.from(document.body.querySelectorAll('*'));

                    // Prices
                    const priceEls = allEls.filter(el =>
                        el.children.length === 0 &&
                        el.textContent &&
                        priceRegex.test(el.textContent)
                    ).map(el => {
                        const rect = el.getBoundingClientRect();
                        return { el, rect, text: el.textContent?.trim() };
                    });

                    // Images (ignore small icons and likely banners)
                    const imgs = Array.from(document.querySelectorAll('img'))
                        .filter(img => {
                            const rect = img.getBoundingClientRect();
                            // Size filter: not too small (icon), not too wide (banner)
                            return rect.width > 50 && rect.height > 50 && rect.width < 800;
                        })
                        .map(img => ({ img, rect: img.getBoundingClientRect(), src: img.src, alt: img.alt }));

                    // Titles (h3, h4, strong, p with filtered text)
                    const titleEls = Array.from(document.querySelectorAll('h3, h4, strong, p.goods_name, .ly-mod-goods-ttl, .title, .name, p'))
                        .filter(el => {
                            const t = el.textContent?.trim() || '';
                            // Basic title heuristic: > 5 chars, no price, no 'tax included'
                            return t.length > 5 && !t.includes('円') && !t.includes('税込');
                        })
                        .map(el => ({ el, rect: el.getBoundingClientRect(), text: el.textContent?.trim() }));

                    const results: any[] = [];
                    const processedImages = new Set<string>();

                    // 2. Match Price to Closest Image strictly ABOVE/NEAR it
                    for (const price of priceEls) {
                        // Find closest image
                        let bestImg = null;
                        let minDist = Infinity;

                        for (const img of imgs) {
                            // Image must be above or slightly below (aligned)
                            // Usually Image is above Price.

                            // Center points
                            const pCenter = { x: price.rect.left + price.rect.width / 2, y: price.rect.top + price.rect.height / 2 };
                            const iCenter = { x: img.rect.left + img.rect.width / 2, y: img.rect.top + img.rect.height / 2 };

                            const dist = Math.sqrt(Math.pow(pCenter.x - iCenter.x, 2) + Math.pow(pCenter.y - iCenter.y, 2));

                            // Heuristic: Image should be roughly above or aligned with price
                            // Horizontal alignment check: < 300px
                            // Vertical check: Price is roughly below Image
                            if (Math.abs(pCenter.x - iCenter.x) < 300 && (price.rect.top > img.rect.top)) {
                                if (dist < minDist) {
                                    minDist = dist;
                                    bestImg = img;
                                }
                            }
                        }

                        if (bestImg && minDist < 600) {
                            // Find Title (closest text above price, below image?)
                            let bestTitle = '未知の製品';
                            let minTitleDist = Infinity;

                            for (const t of titleEls) {
                                const dist = Math.sqrt(Math.pow(price.rect.x - t.rect.x, 2) + Math.pow(price.rect.y - t.rect.y, 2));
                                // Title usually above price
                                if (price.rect.top > t.rect.top && dist < minTitleDist && dist < 400) {
                                    minTitleDist = dist;
                                    bestTitle = t.text || '';
                                }
                            }

                            // Fallback to alt if title not found
                            if (bestTitle === '未知の製品' && bestImg.alt && bestImg.alt.length > 5) {
                                bestTitle = bestImg.alt;
                            }

                            if (!processedImages.has(bestImg.src)) {
                                processedImages.add(bestImg.src);
                                results.push({
                                    name: bestTitle,
                                    priceText: price.text,
                                    dateText: '',
                                    imgUrl: bestImg.src,
                                    sourceUrl: location.href // Use current page URL
                                });
                            }
                        }
                    }
                    return results;
                });

                console.log(`   found ${pageProducts.length} items on this page`);

                // 使用 AI Parser 處理翻譯
                for (const p of pageProducts) {
                    try {
                        // 準備 AI Parser 請求
                        const parseRequest = {
                            brandName: 'familymart',
                            listMarkdownContent: `${p.name}\n${p.priceText}\n${p.dateText}`,
                            productLink: {
                                title: p.name,
                                url: link.url,
                                imageUrl: p.imgUrl,
                                rawText: `${p.name}\n${p.priceText}\n${p.dateText}`,
                                isNew: true
                            },
                            sourceUrl: link.url
                        };

                        await new Promise(resolve => setTimeout(resolve, 200)); // 避免 API rate limit

                        const aiResult = await this.aiParser.parseProducts(parseRequest);

                        if (aiResult.success && aiResult.products.length > 0) {
                            const parsed = aiResult.products[0]!;
                            products.push({
                                originalName: p.name,
                                translatedName: parsed.translatedName || p.name,
                                originalDescription: parsed.originalDescription,
                                translatedDescription: parsed.translatedDescription,
                                originalDetailedDescription: parsed.originalDetailedDescription,
                                translatedDetailedDescription: parsed.translatedDetailedDescription,
                                price: parsed.price,
                                category: parsed.category,
                                releaseDate: parsed.releaseDate,
                                allergens: parsed.allergens,
                                nutrition: parsed.nutrition,
                                imageUrl: p.imgUrl || parsed.imageUrl,
                                sourceUrl: `${link.url}#${p.imgUrl.split('/').pop()?.split('?')[0] || Math.random()}`,
                                isNew: true
                            });
                            console.log(`   ✅ ${p.name} → ${parsed.translatedName || p.name} (${parsed.price?.amount || 'N/A'} JPY)`);
                        } else {
                            // Fallback: 沒有 AI 解析結果
                            const priceMatch = p.priceText.match(/(\d{1,3}(,\d{3})*)/);
                            const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, '')) : undefined;

                            products.push({
                                originalName: p.name,
                                translatedName: p.name, // Fallback 保持原文
                                price: price ? { amount: price, currency: 'JPY' } : undefined,
                                imageUrl: p.imgUrl,
                                releaseDate: p.dateText,
                                sourceUrl: `${link.url}#${p.imgUrl.split('/').pop()?.split('?')[0] || Math.random()}`,
                                isNew: true
                            });
                            console.log(`   ⚠️ ${p.name} (AI 解析失敗，使用原文)`);
                        }
                    } catch (e) {
                        console.error(`   ❌ AI 解析失敗 ${p.name}:`, e);
                        // Fallback 處理
                        const priceMatch = p.priceText.match(/(\d{1,3}(,\d{3})*)/);
                        const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, '')) : undefined;

                        products.push({
                            originalName: p.name,
                            translatedName: p.name,
                            price: price ? { amount: price, currency: 'JPY' } : undefined,
                            imageUrl: p.imgUrl,
                            releaseDate: p.dateText,
                            sourceUrl: `${link.url}#${p.imgUrl.split('/').pop()?.split('?')[0] || Math.random()}`,
                            isNew: true
                        });
                    }
                }

            } catch (e) {
                console.error(`Failed to parse campaign page ${link.url}:`, e);
            }
        }
        await page.close();
        return products;
    }

    private deduplicateProducts(products: ProductInfo[]): ProductInfo[] {
        const seen = new Set<string>();
        return products.filter(p => {
            // Use explicit properties for uniqueness
            // Note: sourceUrl is now unique, but we want to avoid exact dups if scraper runs twice overlapping
            // But for batch processing, we mainly want to dedupe identical products found in this run

            const key = `${p.imageUrl}-${p.price?.amount}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
