
import { chromium } from 'playwright';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class StarbucksStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        const startTime = Date.now();
        const allProducts: ProductInfo[] = [];
        const urlsToScrape = [brandConfig.url];
        if (brandConfig.url2) {
            urlsToScrape.push(brandConfig.url2);
        }

        console.log(`☕ [StarbucksStrategy] 開始抓取，目標網址數量: ${urlsToScrape.length}`);
        let browser = null;

        try {
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();

            for (const url of urlsToScrape) {
                console.log(`☕ [StarbucksStrategy] 正在處理: ${url}`);

                try {
                    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
                    await page.waitForTimeout(brandConfig.options?.waitFor || 3000);

                    const targetSelector = '.card-wrap.main-wrap.category-main-layout .card';

                    try {
                        await page.waitForSelector('.card-wrap.main-wrap.category-main-layout', { timeout: 10000 });
                    } catch (e) {
                        console.warn(`⚠️ [StarbucksStrategy] 在 ${url} 找不到目標區塊`);
                        continue;
                    }

                    // 手動提取資訊 (DOM)
                    const products: ProductInfo[] = await page.$$eval(targetSelector, (cards) => {
                        return cards.map(card => {
                            const linkEl = card.querySelector('a.card__inner') as HTMLAnchorElement;
                            const imgEl = card.querySelector('.card__inner__img img') as HTMLImageElement;
                            const nameEl = card.querySelector('.card__inner__text .text-limit');
                            const priceEl = card.querySelector('.card__inner__text .english');

                            if (!linkEl) return null;

                            const rawPrice = priceEl?.textContent?.trim() || '';
                            const priceMatch = rawPrice.match(/￥([\d,]+)/);
                            const priceAmount = (priceMatch && priceMatch[1]) ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : undefined;

                            let imageUrl = imgEl?.getAttribute('src') || '';
                            if (imageUrl.startsWith('//')) {
                                imageUrl = 'https:' + imageUrl;
                            } else if (imageUrl && !imageUrl.startsWith('http')) {
                                if (imageUrl.startsWith('/')) imageUrl = 'https://product.starbucks.co.jp' + imageUrl;
                            }

                            let productUrl = linkEl.getAttribute('href') || '';
                            if (productUrl.startsWith('//')) {
                                productUrl = 'https:' + productUrl;
                            } else if (productUrl.startsWith('/')) {
                                productUrl = 'https://product.starbucks.co.jp' + productUrl;
                            }

                            return {
                                originalName: nameEl?.textContent?.trim() || imgEl?.getAttribute('alt') || 'Unknown',
                                translatedName: '', // 待翻譯
                                price: priceAmount ? {
                                    amount: priceAmount,
                                    currency: 'JPY',
                                    note: rawPrice
                                } : undefined,
                                imageUrl: imageUrl,
                                sourceUrl: productUrl
                            };
                        }).filter(p => p !== null) as any[];
                    });

                    console.log(`✨ [StarbucksStrategy] 從頁面 DOM 提取出 ${products.length} 個產品`);

                    // 使用 AI Parser 批次翻譯產品名稱
                    console.log(`🤖 [StarbucksStrategy] 開始翻譯產品名稱...`);
                    for (const product of products) {
                        if (product.originalName && !product.translatedName) {
                            try {
                                const translated = await this.aiParser.translateToTraditionalChinese(product.originalName);
                                product.translatedName = translated || product.originalName;
                            } catch (e) {
                                console.warn(`⚠️ 翻譯失敗，使用原名: ${product.originalName}`);
                                product.translatedName = product.originalName;
                            }
                        }
                    }

                    allProducts.push(...products);

                } catch (err) {
                    console.error(`❌ [StarbucksStrategy] 處理 ${url} 失敗:`, err);
                }
            }

            await browser.close();

            const uniqueProducts = this.removeDuplicateProducts(allProducts);

            return {
                brand: {
                    name: brandConfig.name,
                    displayName: brandConfig.displayName,
                    category: brandConfig.category,
                    url: brandConfig.url
                },
                productsCount: uniqueProducts.length,
                products: uniqueProducts,
                status: uniqueProducts.length > 0 ? 'success' : 'failed',
                executionTime: Date.now() - startTime,
                scrapedAt: new Date()
            };
        } catch (error) {
            console.error('❌ [StarbucksStrategy] Critical Error:', error);
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
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                executionTime: Date.now() - startTime,
                scrapedAt: new Date()
            };
        }
    }

    private removeDuplicateProducts(products: ProductInfo[]): ProductInfo[] {
        const seen = new Set<string>();
        return products.filter(product => {
            const key = `${product.originalName}-${product.price?.amount}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
