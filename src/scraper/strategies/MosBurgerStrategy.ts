import { chromium } from 'playwright';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class MosBurgerStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        console.log('DEBUG: MosBurgerStrategy.scrape called');
        const startTime = Date.now();
        console.log(`🍔 [Mos Burger] 開始抓取: ${brandConfig.displayName}`);

        let browser = null;
        try {
            browser = await chromium.launch();
            const page = await browser.newPage();

            const url = brandConfig.url;
            console.log(`   🔗 前往: ${url}`);

            // Enable console logging from browser
            page.on('console', msg => {
                const type = msg.type();
                if (type === 'debug' || type === 'info' || type === 'log') {
                    console.log(`PAGE LOG: ${msg.text()}`);
                }
            });

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for the recommend section
            console.log('DEBUG: Waiting for .menu-recommend selector...');
            try {
                await page.waitForSelector('.menu-recommend', { timeout: 15000 });
                console.log('DEBUG: Found .menu-recommend section.');
            } catch (e) {
                console.warn('DEBUG: .menu-recommend selector not found immediately.');
            }

            const products = await page.evaluate(() => {
                const results: any[] = [];
                const recommendSection = document.querySelector('.menu-recommend');

                if (!recommendSection) {
                    console.log('PAGE LOG: No .menu-recommend found');
                    return results;
                }

                // The user mentioned looking for data in "list" inside the recommend block.
                // Assuming standard Mos Burger structure: usually <li> items or <div> cards inside.
                // Let's try to find product items generically within the recommend section.
                // Common patterns: .item, .menu-item, or just li

                // Based on user prompt "可以參考name: 'kfc'的抓取區塊推薦清單裡的資料",
                // implies we should just iterate children or specific classes.
                // Let's query all 'li' or children that look like products.
                const items = Array.from(recommendSection.querySelectorAll('li, .item'));

                console.log(`PAGE LOG: Found ${items.length} items in .menu-recommend`);

                for (const container of items) {
                    // 1. Image (Handle relative path)
                    const img = container.querySelector('img');
                    if (!img) continue;

                    let imgSrc = img.getAttribute('src');
                    if (!imgSrc) continue;

                    // Fix relative path - 處理各種相對路徑格式
                    const baseUrl = 'https://www.mos.jp';
                    const currentPath = '/menu/';

                    if (imgSrc.startsWith('//')) {
                        // Protocol-relative URL: //cdn.example.com/img.jpg
                        imgSrc = 'https:' + imgSrc;
                    } else if (imgSrc.startsWith('/')) {
                        // Absolute path: /img/menu/...
                        imgSrc = baseUrl + imgSrc;
                    } else if (imgSrc.startsWith('./')) {
                        // Relative to current directory: ./img/...
                        imgSrc = baseUrl + currentPath + imgSrc.substring(2);
                    } else if (imgSrc.startsWith('../')) {
                        // Relative to parent directory: ../img/...
                        imgSrc = baseUrl + '/img/' + imgSrc.split('../').pop();
                    } else if (!imgSrc.startsWith('http://') && !imgSrc.startsWith('https://')) {
                        // Relative path without prefix: img/...
                        imgSrc = baseUrl + currentPath + imgSrc;
                    }
                    // 如果已經是完整 URL (http:// 或 https://)，則不處理

                    // 2. Name
                    // Try common selectors for name
                    const nameEl = container.querySelector('.name, .title, .menu_name');
                    // If no specific class, verify if image alt can be used or text content
                    let name = nameEl?.textContent?.trim() || img.getAttribute('alt') || '';

                    if (!name) {
                        // Fallback to text lines if needed, but usually .name exists
                        const text = container.textContent?.trim() || '';
                        const lines = text.split('\n');
                        if (lines.length > 0) name = lines[0]?.trim() || '';
                    }

                    if (!name) continue;

                    // 3. Price (Handle multiple prices - Lowest)
                    // Search for all price-like patterns
                    const textContent = container.textContent || '';
                    // Regex to find prices like 440円, ¥440, 440 (raw context)
                    // But safer to look for digits followed by optional yen/円
                    // Mos Burger usually displays "¥440" or "440円"

                    // Let's find specific price elements first
                    const priceEls = container.querySelectorAll('.price, .val');
                    let prices: number[] = [];

                    if (priceEls.length > 0) {
                        priceEls.forEach(el => {
                            const t = el.textContent?.replace(/[^\d]/g, '') || '';
                            if (t) prices.push(parseInt(t, 10));
                        });
                    } else {
                        // Regex fallback on full text
                        const matches = textContent.match(/[¥￥]?\s*(\d{1,3}(,\d{3})*)\s*(?:円|yen|-)?/gi);
                        if (matches) {
                            matches.forEach(m => {
                                const num = parseInt(m.replace(/[^\d]/g, ''), 10);
                                if (num > 10) prices.push(num); // Filter out small numbers like calorie counts if possible, though risky
                            });
                        }
                    }

                    if (prices.length === 0) continue;

                    // Get the minimum price
                    const finalPrice = Math.min(...prices);

                    results.push({
                        name: name,
                        price: finalPrice,
                        imgSrc: imgSrc,
                        desc: textContent.trim() // Save full text as description for now
                    });
                }

                return results;
            });

            console.log(`   🔍 找到 ${products.length} 個潛在產品`);

            const finalProducts: ProductInfo[] = [];
            for (const item of products) {
                // AI translation not strictly required by prompt but good practice based on existing code
                // Skipping AI transform for speed if not strictly requested, but reusing existing stricture
                // The user prompt focuses on logic, so I will keep the structure similar to KFC.

                finalProducts.push({
                    originalName: item.name,
                    translatedName: await this.aiParser.translateToTraditionalChinese(item.name),
                    originalDescription: item.desc,
                    translatedDescription: item.desc,
                    price: { amount: item.price, currency: 'JPY' },
                    imageUrl: item.imgSrc,
                    isNew: true,
                    sourceUrl: url
                });
            }

            await browser.close();

            return {
                brand: {
                    name: brandConfig.name,
                    displayName: brandConfig.displayName,
                    category: brandConfig.category,
                    url: brandConfig.url
                },
                productsCount: finalProducts.length,
                products: finalProducts,
                status: finalProducts.length > 0 ? 'success' : 'partial_success',
                executionTime: Date.now() - startTime,
                scrapedAt: new Date()
            };

        } catch (error) {
            console.error(`❌ [Mos Burger] 抓取失敗:`, error);
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
}
