import { chromium } from 'playwright';
import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult, ProductInfo, ProductLink } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';

export class SukiyaStrategy implements ScraperStrategy {
    private aiParser: AIParserService;

    constructor(aiParser: AIParserService) {
        this.aiParser = aiParser;
    }

    async scrape(brandConfig: BrandConfig): Promise<ScraperResult> {
        const startTime = Date.now();
        console.log(`🏪 [Sukiya] 開始抓取: ${brandConfig.displayName}`);

        let browser = null;
        try {
            browser = await chromium.launch();
            const page = await browser.newPage();

            // 1. 抓取首頁 Banner 連結
            const scannedLinks = await this.scrapeCarouselLinks(page, brandConfig.url);
            console.log(`🔗 [Sukiya] 找到 ${scannedLinks.length} 個 AI 驗證通過的連結`);

            if (scannedLinks.length === 0) {
                console.warn('⚠️ 未找到連結，可能選擇器失效或目前沒有促銷 Banner');
            }

            // 2. 抓取詳細頁面
            console.log(`🔍 [Sukiya] 開始深度抓取 ${scannedLinks.length} 個頁面...`);
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
            console.error(`❌ [Sukiya] 抓取失敗:`, error);
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

        // 等待推薦選單輪播載入
        try {
            await page.waitForSelector('#recommend_menu', { timeout: 10000 });
        } catch (e) {
            console.warn('⚠️ 找不到 #recommend_menu，嘗試繼續執行...');
        }

        // 提取所有候選項目
        // Sukiya recommend_menu: 推薦選單區的產品輪播
        const rawItems = await page.$$eval('#recommend_menu .slick-slide:not(.slick-cloned)', (els: HTMLElement[]) => {
            const seen = new Set<string>();
            return els.map(el => {
                const anchor = el.querySelector('a');
                const img = el.querySelector('img');
                const imgSrc = img?.getAttribute('src') || '';

                // 嘗試獲取 Alt 作為標題
                const text = (img?.getAttribute('alt') || anchor?.innerText || '').trim();

                // 排除無連結或無圖片的項目
                if (!anchor || !imgSrc || seen.has(imgSrc)) return null;
                seen.add(imgSrc);

                return {
                    url: anchor.href,
                    text: text,
                    imgSrc: imgSrc
                };
            }).filter(i => i !== null && i.url);
        });

        console.log(`🔎 找到 ${rawItems.length} 個輪播項目，開始 AI 視覺篩選...`);

        const links: ProductLink[] = [];

        for (const item of rawItems) {
            // 確保圖片 URL 是完整的絕對路徑
            let validImg = item.imgSrc;

            // 處理相對路徑：使用 new URL() 避免雙斜線問題
            if (!validImg.startsWith('http')) {
                try {
                    // 特別處理 Sukiya 的 assets 相對路徑
                    if (validImg.startsWith('assets/') || validImg.startsWith('/assets/')) {
                        // 移除開頭的 slash 以便統一處理
                        const cleanPath = validImg.replace(/^\//, '');
                        validImg = `https://www.sukiya.jp/${cleanPath}`;
                    } else {
                        validImg = new URL(validImg, url).href;
                    }
                } catch (e) {
                    console.warn(`⚠️ 無法解析圖片 URL: ${validImg}`);
                    continue;
                }
            }

            // 使用 AI 判斷是否為食物廣告
            await new Promise(r => setTimeout(r, 500)); // Rate limit

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

        for (const link of links) {
            try {
                console.log(`📄 解析產品頁面: ${link.url}`);
                await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

                // 使用與麥當勞相同的策略：在活動頁面中尋找多個產品卡片
                const pageProducts = await page.evaluate(() => {
                    const extracted: Array<{
                        name: string;
                        description?: string;
                        priceText?: string;
                        imgUrl?: string;
                        url: string;
                    }> = [];

                    // Strategy 1: 尋找產品卡片 (Product Cards)
                    const cards = Array.from(document.querySelectorAll(`
                        .menu-item,
                        .product-item,
                        .item-card,
                        div[class*="menu"] > div:has(img),
                        div[class*="product"] > div:has(img),
                        .menuItem,
                        article:has(img)
                    `));

                    if (cards.length > 0) {
                        for (const card of cards) {
                            const typedCard = card as HTMLElement;

                            // 提取標題
                            const title = typedCard.querySelector('h1, h2, h3, h4, .title, .name, .menu-name')?.textContent?.trim();

                            // 提取價格
                            const priceEl = typedCard.querySelector('.price, .menu-price, [class*="price"]');
                            let priceText = priceEl ? priceEl.textContent?.trim() : '';

                            // 如果沒找到價格元素，嘗試從文字中提取
                            if (!priceText) {
                                const textContent = typedCard.innerText;
                                const priceMatch = textContent.match(/¥?(\d{1,3}(,?\d{3})*)円?/);
                                if (priceMatch) priceText = priceMatch[0];
                            }

                            // 提取描述
                            const description = typedCard.querySelector('.description, .detail, p')?.textContent?.trim();

                            // 提取圖片
                            // 優先尋找明確的產品圖片 (包含了 photo_ 的檔案)
                            let img = typedCard.querySelector('img[src*="photo_"]') as HTMLImageElement;

                            // 如果沒找到特定格式，則使用一般規則但排除特定 Icon
                            if (!img) {
                                const images = Array.from(typedCard.querySelectorAll('img'));
                                img = images.find(i => {
                                    const src = i.getAttribute('src') || '';
                                    const alt = i.getAttribute('alt') || '';
                                    const isIcon = src.includes('img_ei') ||
                                        src.includes('img_to') ||
                                        src.includes('icon') ||
                                        alt === '店内' ||
                                        alt === 'お持ち帰り';
                                    const isBadge = i.className.includes('badge');
                                    return !isIcon && !isBadge;
                                }) as HTMLImageElement;
                            }

                            const imgSrc = img?.getAttribute('src') || img?.getAttribute('data-src');

                            // 必須至少有標題或圖片
                            if ((title || imgSrc) && title !== '新着情報' && title !== 'ニュース') {
                                extracted.push({
                                    name: title || 'Sukiya Product',
                                    description: description,
                                    priceText: priceText,
                                    imgUrl: imgSrc || undefined,
                                    url: location.href
                                });
                            }
                        }
                    }

                    // Strategy 2: 如果沒找到卡片，嘗試單一產品頁面
                    if (extracted.length === 0) {
                        const title = document.querySelector('h1, h2')?.textContent?.trim();
                        const description = document.querySelector('.description, .detail, p')?.textContent?.trim();
                        const img = document.querySelector('main img, .product-image img')?.getAttribute('src');
                        const priceText = document.body.innerText.match(/(¥)?(\d{1,3}(,?\d{3})*)円?/)?.[0];

                        if (title && img) {
                            extracted.push({
                                name: title,
                                description: description,
                                priceText: priceText || '',
                                imgUrl: img || undefined,
                                url: location.href
                            });
                        }
                    }

                    return extracted;
                });

                console.log(`   🔍 在此頁面找到 ${pageProducts.length} 個產品`);

                if (pageProducts.length === 0) {
                    console.log(`   ⚠️ 此頁面未找到明顯產品資訊`);
                }

                for (const p of pageProducts) {
                    // 過濾區域限定
                    if (p.name.includes('地域限定') || p.name.includes('エリア限定') || p.name.includes('区域限定')) {
                        console.log(`⚠️ 跳過區域限定產品: ${p.name}`);
                        continue;
                    }
                    if (p.description?.includes('地域限定') || p.description?.includes('エリア限定')) {
                        console.log(`⚠️ 跳過區域限定產品: ${p.name}`);
                        continue;
                    }

                    // 確保圖片 URL 是完整路徑
                    let fullImgUrl = p.imgUrl;
                    if (fullImgUrl && !fullImgUrl.startsWith('http')) {
                        try {
                            if (fullImgUrl.startsWith('assets/') || fullImgUrl.startsWith('/assets/')) {
                                const cleanPath = fullImgUrl.replace(/^\//, '');
                                fullImgUrl = `https://www.sukiya.jp/${cleanPath}`;
                            } else {
                                fullImgUrl = new URL(fullImgUrl, link.url).href;
                            }
                        } catch (e) {
                            console.warn(`⚠️ 無法解析產品圖片 URL: ${fullImgUrl}`);
                        }
                    }

                    // 解析價格
                    const priceMatch = p.priceText?.match(/(\d{1,3}(,?\d{3})*)/);
                    const priceAmount = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : undefined;

                    // 翻譯名稱
                    const translatedName = await this.aiParser.translateToTraditionalChinese(p.name);

                    products.push({
                        originalName: p.name,
                        translatedName: translatedName,
                        originalDescription: p.description,
                        translatedDescription: p.description,
                        price: priceAmount ? {
                            amount: priceAmount,
                            currency: 'JPY'
                        } : undefined,
                        imageUrl: fullImgUrl || link.imageUrl, // 如果活動頁沒圖，fallback 到 Banner 圖
                        isNew: true,
                        sourceUrl: link.url
                    });
                }

            } catch (err) {
                console.error(`❌ 解析頁面失敗 ${link.url}:`, err);
            }
        }

        await page.close();
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
