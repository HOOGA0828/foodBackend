import { chromium } from 'playwright';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class KfcStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        console.log('DEBUG: KfcStrategy.scrape called');
        const startTime = Date.now();
        console.log(`🏪 [KFC] 開始抓取: ${brandConfig.displayName}`);

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

            // Initial navigation
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log('DEBUG: Page loaded (domcontentloaded).');

            // Wait for loading animation to detach
            try {
                await page.waitForSelector('.home-loading-animation', { state: 'detached', timeout: 15000 });
            } catch (e) {
                // ignore
            }

            // Wait specifically for the campaign section
            console.log('DEBUG: Waiting for #campaign selector...');
            try {
                await page.waitForSelector('#campaign', { timeout: 20000 });
                console.log('DEBUG: Found #campaign section.');
            } catch (e) {
                console.error('DEBUG: #campaign selector not found!');
            }

            // Scroll to bottom to trigger lazy loading
            console.log('DEBUG: Scrolling to trigger lazy loading...');
            await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
                    let totalHeight = 0;
                    const distance = 100;
                    const timer = setInterval(() => {
                        const scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if (totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
            // Wait for images to settle
            await page.waitForTimeout(2000);

            // Extract items from #campaign
            const products = await page.evaluate(async () => {
                const results: any[] = [];
                const campaignDiv = document.querySelector('#campaign');

                // If campaign div not found, try searching document-wide fallback
                const root = campaignDiv || document.body;
                if (!campaignDiv) console.log('DEBUG: Using document.body fallback (no #campaign)');

                // Select specific product containers inside the campaign/root section
                // Previous selector `.product-container.pickup` only matches the first item.
                // Analysis shows all items share `plp-item-card` class.
                const specificContainers = Array.from(root.querySelectorAll('.plp-item-card'));

                // Fallback to simpler selector if strict one fails
                const containers = specificContainers.length > 0 ? specificContainers : Array.from(root.querySelectorAll('.product-container'));

                if (containers.length === 0) {
                    console.log('DEBUG: No .plp-item-card found at all.');
                }

                for (const container of containers) {
                    const img = container.querySelector('img');
                    if (!img || !img.getAttribute('src')) {
                        // Some containers might be loading skeletons
                        console.log('PAGE LOG: Skip container - no image (src missing or no img tag)');
                        continue;
                    }

                    let foundPrice = null;
                    let foundName = null;

                    // Extract text from the container
                    const text = container.textContent || '';

                    // Regex for price:
                    // Matches ¥1230, ¥ 1,230, 1230円
                    // \u00a5 is Yen symbol
                    const priceRegex = /[¥￥\u00a5円]?\s*([\d,]+)\s*(?:円)?/;

                    // 1. Try class-based price first
                    const priceEl = container.querySelector('[data-testid="item-price"]');
                    if (priceEl && priceEl.textContent) {
                        const pText = priceEl.textContent.replace(/[^\d]/g, '');
                        if (pText.length > 0) {
                            foundPrice = parseInt(pText, 10);
                        }
                    }

                    // 2. Fallback to Regex on full text
                    if (!foundPrice) {
                        const match = text.match(priceRegex);
                        if (match && match[1]) {
                            const pText = match[1].replace(/,/g, '');
                            if (pText.length > 1 || parseInt(pText) > 10) {
                                foundPrice = parseInt(pText, 10);
                            }
                        }
                    }

                    // Extract name
                    // Prioritize specific header class found in dump
                    const header = container.querySelector('.menu-product-header, h3, h4, .title, .name');
                    if (header) {
                        foundName = header.textContent?.trim();
                    }

                    if (!foundName) {
                        // Fallback: Use image alt
                        foundName = img.getAttribute('alt') || '';
                    }

                    if (!foundName && text) {
                        // Fallback: simple text parsing
                        const lines = text.split('\n').filter(l => {
                            const t = l.trim();
                            return t.length > 1 && !t.includes('¥') && !t.includes('円');
                        });
                        if (lines.length > 0) foundName = (lines[0] || '').trim();
                    }

                    if (foundPrice) {
                        console.log(`PAGE LOG: Found product: ${foundName ? foundName.substring(0, 15) : 'Unknown'}... Price: ${foundPrice}`);
                        results.push({
                            name: foundName || 'KFC Product',
                            price: foundPrice,
                            imgSrc: img.getAttribute('src'),
                            desc: text.trim()
                        });
                    } else {
                        console.log(`PAGE LOG: Skip container - no price found. Text start: ${text.substring(0, 20)}`);
                    }
                }

                return results;
            });

            console.log(`   🔍 找到 ${products.length} 個潛在產品`);

            const finalProducts: ProductInfo[] = [];
            for (const item of products) {
                const safeName = item.name || '未知產品';
                const translatedName = await this.aiParser.translateToTraditionalChinese(safeName);

                finalProducts.push({
                    originalName: safeName,
                    translatedName: translatedName,
                    originalDescription: item.desc || '',
                    translatedDescription: item.desc || '',
                    price: { amount: item.price, currency: 'JPY' },
                    imageUrl: item.imgSrc || '',
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
            console.error(`❌ [KFC] 抓取失敗 (Catch Block):`, error);
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
