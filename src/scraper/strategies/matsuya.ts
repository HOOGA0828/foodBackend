import { chromium } from 'playwright';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class MatsuyaStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        const startTime = Date.now();
        console.log(`🏪 [Matsuya] 開始抓取: ${brandConfig.displayName}`);

        let browser = null;
        try {
            browser = await chromium.launch();
            const page = await browser.newPage();

            // 定義目標分類 URL - 只抓取「おすすめ」 (Recommended)
            const categories = [
                { id: 'limited', url: 'https://www.matsuyafoods.co.jp/matsuya/menu/limited/index.html' }
            ];

            let allProducts: ProductInfo[] = [];

            for (const category of categories) {
                console.log(`📂 [Matsuya] 抓取分類: ${category.id}`);
                const products = await this.scrapeCategory(page, category.url);
                allProducts = allProducts.concat(products);
                // 禮貌性延遲
                await new Promise(r => setTimeout(r, 1000));
            }

            // 關閉瀏覽器
            await browser.close();
            browser = null;

            // 去重
            const uniqueProducts = this.deduplicateProducts(allProducts);

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
            console.error(`❌ [Matsuya] 抓取失敗:`, error);
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

    private async scrapeCategory(page: any, url: string): Promise<ProductInfo[]> {
        const products: ProductInfo[] = [];
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const rawItems = await page.$$eval('a', (els: HTMLAnchorElement[]) => {
                const results = [];
                const seenImgs = new Set();

                for (const el of els) {
                    // Check if it's a menu link
                    if (!el.href.includes('.html')) continue;
                    // Ignore anchors pointing to an ID on the same page
                    if (el.href.includes('#')) continue;

                    // Ignore obvious non-product links
                    if (el.innerText.includes('TOP') || el.innerText.includes('メニュー')) continue;

                    let container = el.parentElement;
                    let foundName = '';
                    let foundPrice = '';
                    let foundImg = '';
                    let foundDesc = '';

                    // Initial search in anchor itself
                    const innerImg = el.querySelector('img');
                    if (innerImg) foundImg = innerImg.getAttribute('src') || innerImg.getAttribute('data-src') || '';
                    if (el.innerText.includes('円')) foundPrice = el.innerText;

                    // Traverse up up to 3 levels to find container
                    let bestContainer = null;
                    for (let i = 0; i < 3; i++) {
                        if (!container) break;
                        const text = container.innerText;

                        // Check if container has price
                        if (text.includes('円')) {
                            // Fix regex to handle numbers like "1580円" (no comma)
                            // Was: /(\d{1,3}(,\d{3})*)円/ which fails on 1580
                            const priceMatch = text.match(/([\d,]+)円/);
                            if (priceMatch) {
                                foundPrice = priceMatch[0];
                                bestContainer = container; // Found a container with price
                            }
                        }

                        // Check if container has image if we don't have one
                        if (!foundImg) {
                            const img = container.querySelector('img');
                            if (img) foundImg = img.getAttribute('src') || img.getAttribute('data-src') || '';
                        }

                        if (foundPrice && foundImg) break;
                        container = container.parentElement;
                    }

                    // Extract logic from best container
                    if (bestContainer) {
                        // Name: Try finding specific classes first
                        const titleEl = bestContainer.querySelector('h3, h4, .menu-title, .title, .ttl, .name');
                        if (titleEl) foundName = titleEl.textContent?.trim() || '';

                        // Fallback Name: Split text by newline
                        if (!foundName) {
                            const lines = bestContainer.innerText.split('\n').map(l => l.trim()).filter(l => l);
                            // Assume first line is name if not price
                            if (lines.length > 0 && !lines[0].includes('円')) {
                                foundName = lines[0];
                            } else if (innerImg && innerImg.getAttribute('alt')) {
                                foundName = innerImg.getAttribute('alt') || '';
                            }
                        }

                        const descEl = bestContainer.querySelector('.desc, .text');
                        if (descEl) foundDesc = descEl.textContent?.trim() || '';
                    }

                    if (foundName && foundPrice && foundImg && !seenImgs.has(foundImg)) {
                        seenImgs.add(foundImg);
                        results.push({ name: foundName, priceText: foundPrice, desc: foundDesc, imgSrc: foundImg, href: el.href });
                    }
                }
                return results;
            });

            console.log(`   🔍 找到 ${rawItems.length} 個潛在項目`);

            for (const item of rawItems) {
                // 1. Price Check
                const priceMatch = item.priceText.match(/([\d,]+)円/);
                if (!priceMatch) continue;
                const price = parseInt(priceMatch[1].replace(/,/g, ''));

                // 2. Filter Check
                const fullName = item.name + ' ' + item.desc;
                if (fullName.includes('地域限定') || fullName.includes('区域限定') || fullName.includes('エリア限定')) continue;
                if (fullName.includes('単品') || fullName.includes('單品')) continue;
                if (fullName.includes('その他のメニュー')) continue; // Explicitly filter out "Other Menu"

                if (!item.imgSrc) continue;
                // Filter out SVG icons (often used for 'Back to Top' or category icons)
                if (item.imgSrc.endsWith('.svg')) continue;

                // Fix Relative Image URL
                let validImg = item.imgSrc;
                if (!validImg.startsWith('http')) {
                    validImg = new URL(validImg, url).href;
                }

                // AI Translation
                const translatedName = await this.aiParser.translateToTraditionalChinese(item.name);

                products.push({
                    originalName: item.name,
                    translatedName: translatedName,
                    originalDescription: item.desc,
                    translatedDescription: item.desc,
                    price: { amount: price, currency: 'JPY' },
                    imageUrl: validImg,
                    isNew: true,
                    sourceUrl: item.href
                });
            }

        } catch (e) {
            console.error(`   ⚠️ 抓取分類頁面失敗 ${url}:`, e);
        }
        return products;
    }

    private deduplicateProducts(products: ProductInfo[]): ProductInfo[] {
        const seen = new Set<string>();
        return products.filter(p => {
            const key = p.originalName;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
