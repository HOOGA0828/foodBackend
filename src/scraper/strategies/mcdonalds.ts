import { chromium } from 'playwright';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo, ProductLink } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class McdonaldsStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        const startTime = Date.now();
        console.log(`🏪 [McDonalds] 開始抓取: ${brandConfig.displayName}`);

        let browser = null;
        try {
            browser = await chromium.launch();
            const page = await browser.newPage();

            // 1. 抓取首頁 Banner 連結
            const scannedLinks = await this.scrapeCarouselLinks(page, brandConfig.url);
            console.log(`🔗 [McDonalds] 找到 ${scannedLinks.length} 個 AI 驗證通過的商品連結`);

            if (scannedLinks.length === 0) {
                console.warn('⚠️ 未找到連結，可能是選擇器失效或目前沒有促銷 Banner');
            }

            // 2. 抓取詳細頁面
            console.log(`🔍 [McDonalds] 開始深度抓取 ${scannedLinks.length} 個頁面...`);
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
            console.error(`❌ [McDonalds] 抓取失敗:`, error);
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

        // 等待 Swiper 載入
        try {
            await page.waitForSelector('.swiper-wrapper, .swiper-slide', { timeout: 10000 });
        } catch (e) {
            console.warn('⚠️ 找不到 .swiper-wrapper，嘗試繼續執行...');
        }

        // 提取所有候選項目
        // 麥當勞首頁的 Banner 通常在 .swiper-slide 內，包含圖片和連結
        const rawItems = await page.$$eval('.swiper-slide, .hero-slide', (els: HTMLElement[]) => {
            const seen = new Set<string>();
            return els.map(el => {
                const anchor = el.querySelector('a');
                const img = el.querySelector('img');
                const imgSrc = img?.src || img?.getAttribute('data-src') || ''; // 處理 lazy loading

                // 排除無連結或無圖片的項目
                if (!anchor || !imgSrc || seen.has(imgSrc)) return null;
                seen.add(imgSrc);

                return {
                    url: anchor.href,
                    text: (anchor.textContent || img?.alt || '').trim(),
                    imgSrc: imgSrc
                };
            }).filter(i => i !== null && i.url && !i.url.includes('void(0)'));
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
        const page = await browser.newPage();

        // 限制抓取數量以免執行太久
        const targets = links.slice(0, 10);

        for (const link of targets) {
            try {
                console.log(`📄 解析產品頁面: ${link.url}`);
                await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // 這裡我們嘗試使用通用的幾何抓取邏輯，或是針對麥當勞特定結構
                // 麥當勞產品頁通常會有產品名(h1), 描述(p), 價格(有的有有的沒有)

                const pageProducts = await page.evaluate(() => {
                    const extracted = [];

                    // =================================================================================
                    // 🔍 DEBUGGING TIP / 調試提示:
                    // If you encounter an issue where only ONE product is extracted from a page that has multiple,
                    // it is likely because the "Strategy 1" selector below failed to match the product cards.
                    // The code then falls back to "Strategy 2", which simply grabs the main H1/Image of the page
                    // (often assuming it's a single-product page).
                    //
                    // 如何解決只抓到一筆資料的問題：
                    // 1. 檢查下面的 `cards` selector 是否涵蓋了該頁面的 HTML 結構。
                    // 2. 麥當勞活動頁通常使用 `.product-card-area` 或格柵系統 (grid)。
                    // 3. 嘗試使用更通用的 selector，例如尋找包含 圖片+價格+標題 的容器。
                    // =================================================================================

                    // Strategy 1: Campaign Page with Product Cards (List/Grid view)
                    // We look for common container classes used by McDonald's for product lists.
                    // Candidates:
                    // - .product-card-area .shadow.bg-white (Standard card)
                    // - .container-instance .shadow.bg-white (Generic container)
                    // - .grid > div (Generic grid item - risky but covers more cases)
                    const cards = Array.from(document.querySelectorAll(`
                        .product-card-area .shadow.bg-white, 
                        .container-instance .shadow.bg-white,
                        .cmp-container .shadow.bg-white,
                        div[class*="product-list"] > div,
                        div[class*="grid"] > div:has(img):has(.product-section-price-primary-val)
                    `));

                    if (cards.length > 0) {
                        for (const card of cards) {
                            // Extract Title
                            const title = card.querySelector('h2, .h-l, .product-title, .cmp-title')?.textContent?.trim();

                            // Extract Price
                            // Look for the specific price class, or a generic price pattern text
                            const priceEl = card.querySelector('.product-section-price-primary-val, .price-text');
                            let priceText = priceEl ? priceEl.textContent?.trim() || '' : '';

                            // If no specific price element, try to find text looking like price in the card
                            if (!priceText) {
                                const textContent = card.textContent || '';
                                const priceMatch = textContent.match(/¥\d+(,?\d*)*/);
                                if (priceMatch) priceText = priceMatch[0];
                            }

                            // Extract Description
                            const description = card.querySelector('.container-text, p, .description')?.textContent?.trim();

                            // Extract Image
                            // Prioritize high-res images, avoid icons/badges
                            const img = card.querySelector('img:not([src*="limit_badge"]):not([class*="icon"])');
                            const imgSrc = img?.getAttribute('src') || img?.getAttribute('data-src');

                            // Validation: Must have at least a Source URL (Title is good too but sometimes images are purely graphical)
                            // We prefer having a title.
                            if (title && imgSrc) {
                                extracted.push({
                                    name: title,
                                    description: description || '',
                                    priceText: priceText,
                                    imgUrl: imgSrc,
                                    url: location.href
                                });
                            }
                        }
                    }

                    // Strategy 2: Single Product Page (Fallback)
                    // Only run if specific cards weren't found. This assumes the *whole page* is the product.
                    // This is where "only 1 product extracted" usually happens if Strategy 1 fails.
                    if (extracted.length === 0) {
                        const title = document.querySelector('h1')?.textContent?.trim();
                        const description = document.querySelector('.product-description, .text')?.textContent?.trim();
                        const img = document.querySelector('.product-image img, .hero-image img, main img')?.getAttribute('src');
                        const priceText = document.body.textContent?.match(/(\d{1,3}(,\d{3})*)円/)?.[0];

                        // Ensure it really looks like a product page (needs title and image)
                        if (title && img) {
                            extracted.push({
                                name: title,
                                description: description,
                                priceText: priceText || '',
                                imgUrl: img,
                                url: location.href
                            });
                        }
                    }

                    return extracted;
                });

                if (pageProducts.length === 0) {
                    console.log(`   ⚠️ 此頁面未找到明顯產品資訊，可能不符合單一產品頁結構`);
                    // 可以考慮 fallback 到通用幾何抓取，暫時先略過
                }

                for (const p of pageProducts) {
                    // 確保圖片連結完整
                    let fullImgUrl = p.imgUrl;
                    if (fullImgUrl && !fullImgUrl.startsWith('http')) {
                        fullImgUrl = new URL(fullImgUrl, link.url).href;
                    }

                    const priceMatch = p.priceText.match(/(\d{1,3}(,\d{3})*)/);
                    const price = priceMatch ? parseInt(priceMatch[0].replace(/,/g, '')) : undefined;

                    // 翻譯名稱和描述
                    let translatedName = p.name;
                    let translatedDescription = p.description;

                    try {
                        console.log(`   🔄 翻譯中: ${p.name}...`);
                        translatedName = await this.aiParser.translateToTraditionalChinese(p.name);

                        if (p.description) {
                            translatedDescription = await this.aiParser.translateToTraditionalChinese(p.description);
                        }
                    } catch (error) {
                        console.warn(`   ⚠️ 翻譯失敗，使用原文:`, error);
                    }

                    products.push({
                        originalName: p.name,
                        translatedName: translatedName,
                        price: price ? { amount: price, currency: 'JPY' } : undefined,
                        imageUrl: fullImgUrl || link.imageUrl, // 如果內頁沒抓到圖，用 Banner 圖
                        originalDescription: p.description,
                        translatedDescription: translatedDescription,
                        sourceUrl: link.url,
                        isNew: true
                    });
                    console.log(`   + [${translatedName}] ${p.name}`);
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
