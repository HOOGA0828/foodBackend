import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { BrandConfig } from '../config/brands.js';
import { ScrapedData, ScraperResult, ProductInfo, ProductLink, DetailedProductData, AIParseRequest } from '../types/scraper.js';
import { htmlToMarkdown, estimateTokenCount } from '../utils/htmlCleaner.js';
import { AIParserService } from '../services/aiParser.js';

/**
 * 網頁爬蟲服務
 * 使用 Crawlee Playwright 進行頁面爬取和內容提取
 * 支援二層深度抓取：列表頁面 → 詳細頁面
 */
export class WebScraper {
  private aiParser: AIParserService;

  constructor(aiParser: AIParserService) {
    this.aiParser = aiParser;
  }

  /**
   * 爬取並解析產品資訊 (支援二層抓取)
   * @param brandConfig 品牌配置
   * @returns 完整的解析結果
   */
  async scrapeAndParseBrand(brandConfig: BrandConfig): Promise<ScraperResult> {
    const startTime = Date.now();

    try {
      // 階段 1: 抓取列表頁面並提取產品連結
      console.log(`🕷️ [Scraper] 開始第一階段：抓取 ${brandConfig.displayName} 列表頁面`);
      const scrapedData = await this.scrapeListPage(brandConfig);

      if (!scrapedData.productLinks || scrapedData.productLinks.length === 0) {
        console.log(`⚠️ [Scraper] ${brandConfig.displayName} 未找到產品連結，跳過二層抓取`);
        return await this.parseWithoutDeepCrawling(brandConfig, scrapedData);
      }

      console.log(`✅ [Scraper] ${brandConfig.displayName} 找到 ${scrapedData.productLinks.length} 個產品連結`);

      // 階段 2: 深度抓取產品詳細頁面
      console.log(`🔍 [Scraper] 開始第二階段：深度抓取 ${brandConfig.displayName} 詳細頁面`);
      const detailedData = await this.scrapeDetailPages(brandConfig, scrapedData.productLinks);

      // 階段 3: 合併資訊並解析
      console.log(`🤖 [Scraper] 開始第三階段：解析 ${brandConfig.displayName} 產品資訊`);
      const products = await this.parseWithDeepCrawling(brandConfig, scrapedData, detailedData);

      const executionTime = Date.now() - startTime;
      console.log(`🎉 [Scraper] ${brandConfig.displayName} 二層抓取完成: ${products.length} 個產品，耗時 ${executionTime}ms`);

      return {
        brand: {
          name: brandConfig.name,
          displayName: brandConfig.displayName,
          category: brandConfig.category
        },
        productsCount: products.length,
        products,
        status: 'success',
        executionTime,
        scrapedAt: new Date()
      };

    } catch (error) {
      console.error(`❌ [Scraper] ${brandConfig.displayName} 二層抓取失敗:`, error);

      return {
        brand: {
          name: brandConfig.name,
          displayName: brandConfig.displayName,
          category: brandConfig.category
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

  /**
   * 第一階段：抓取列表頁面並提取產品連結
   */
  private async scrapeListPage(brandConfig: BrandConfig): Promise<ScrapedData> {
    return new Promise(async (resolve, reject) => {
      try {
        const crawler = new PlaywrightCrawler({
          maxRequestsPerMinute: 10,
          maxConcurrency: 1, // 列表頁面只需一個請求

          async requestHandler({ request, page }) {
            try {
              console.log(`📄 [Scraper] 抓取列表頁面: ${request.url}`);

              // 等待頁面載入
              await page.waitForLoadState('networkidle');

              // 執行頁面操作 (滾動載入等)
              await performPageActions(page, brandConfig);

              // 等待額外載入時間
              const waitTime = brandConfig.options?.waitFor || 1000;
              await page.waitForTimeout(waitTime);

              // 獲取頁面 HTML
              const htmlContent = await page.content();
              let targetHtml = htmlContent;

              // 嘗試找到新品區域
              if (brandConfig.newProductSelector) {
                try {
                  await page.waitForSelector(brandConfig.newProductSelector, { timeout: 10000 });
                  const element = await page.$(brandConfig.newProductSelector);
                  if (element) {
                    targetHtml = await element.innerHTML();
                  }
                } catch (error) {
                  console.warn(`⚠️ [Scraper] 無法找到新品選擇器 ${brandConfig.newProductSelector}`);
                }
              }

              // 提取產品連結
              const productLinks = await extractProductLinks(page, brandConfig);

              const scrapedData: ScrapedData = {
                brandName: brandConfig.name,
                url: request.url,
                scrapedAt: new Date(),
                htmlContent: targetHtml,
                markdownContent: htmlToMarkdown(targetHtml),
                productLinks
              };

              resolve(scrapedData);

            } catch (error) {
              reject(error);
            }
          },

          failedRequestHandler({ request }) {
            console.error(`❌ [Scraper] 列表頁面請求失敗: ${request.url}`);
            reject(new Error(`請求失敗: ${request.url}`));
          }
        });

        await crawler.addRequests([{
          url: brandConfig.url,
          userData: { brandConfig }
        }]);

        await crawler.run();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 第二階段：深度抓取產品詳細頁面
   */
  private async scrapeDetailPages(brandConfig: BrandConfig, productLinks: ProductLink[]): Promise<DetailedProductData[]> {
    const deepCrawling = brandConfig.options?.deepCrawling;
    if (!deepCrawling?.enabled) {
      return [];
    }

    const maxProducts = deepCrawling.maxProducts || 20;
    const limitedLinks = productLinks.slice(0, maxProducts);

    console.log(`🔗 [Scraper] 將抓取 ${limitedLinks.length} 個詳細頁面`);

    const detailedData: DetailedProductData[] = [];
    const requestQueue = await RequestQueue.open();

    // 添加詳細頁面請求到隊列
    for (const link of limitedLinks) {
      await requestQueue.addRequest({
        url: link.url,
        userData: { productLink: link, brandConfig }
      });
    }

    const crawler = new PlaywrightCrawler({
      requestQueue,
      maxRequestsPerMinute: 5, // 詳細頁面抓取更保守
      maxConcurrency: 2,

      async requestHandler({ request, page }) {
        const productLink = request.userData.productLink as ProductLink;

        try {
          console.log(`📖 [Scraper] 抓取詳細頁面: ${productLink.title}`);

          // 等待頁面載入
          await page.waitForLoadState('networkidle');

          // 等待詳細頁面載入
          const waitTime = deepCrawling.detailPageWaitFor || 2000;
          await page.waitForTimeout(waitTime);

          // 獲取詳細頁面 HTML
          const detailHtmlContent = await page.content();
          const detailMarkdownContent = htmlToMarkdown(detailHtmlContent);

          detailedData.push({
            productLink,
            detailHtmlContent,
            detailMarkdownContent,
            scrapedAt: new Date()
          });

          console.log(`✅ [Scraper] 詳細頁面完成: ${productLink.title}`);

        } catch (error) {
          console.warn(`⚠️ [Scraper] 詳細頁面失敗 ${productLink.url}:`, error);
          // 不中斷整個流程，繼續處理其他頁面
        }
      },

      failedRequestHandler({ request }) {
        const productLink = request.userData.productLink as ProductLink;
        console.error(`❌ [Scraper] 詳細頁面請求失敗: ${productLink?.url}`);
      }
    });

    await crawler.run();
    await requestQueue.drop();

    console.log(`📚 [Scraper] 詳細頁面抓取完成: ${detailedData.length}/${limitedLinks.length}`);

    return detailedData;
  }

  /**
   * 第三階段：解析產品資訊 (無二層抓取)
   */
  private async parseWithoutDeepCrawling(brandConfig: BrandConfig, scrapedData: ScrapedData): Promise<ScraperResult> {
    const tokenCount = estimateTokenCount(scrapedData.markdownContent);
    console.log(`📊 [Scraper] ${brandConfig.displayName} 內容估計 Token 數: ${tokenCount}`);

    const parseResult = await this.aiParser.parseProducts({
      brandName: brandConfig.name,
      listMarkdownContent: scrapedData.markdownContent,
      sourceUrl: scrapedData.url
    });

    return {
      brand: {
        name: brandConfig.name,
        displayName: brandConfig.displayName,
        category: brandConfig.category
      },
      productsCount: parseResult.products.length,
      products: parseResult.products,
      status: parseResult.success ? 'success' : 'failed',
      errorMessage: parseResult.errorMessage,
      executionTime: 0,
      scrapedAt: new Date()
    };
  }

  /**
   * 第三階段：解析產品資訊 (包含二層抓取)
   */
  private async parseWithDeepCrawling(
    brandConfig: BrandConfig,
    scrapedData: ScrapedData,
    detailedData: DetailedProductData[]
  ): Promise<ProductInfo[]> {
    const allProducts: ProductInfo[] = [];

    // 對每個詳細頁面進行 AI 解析
    for (const detail of detailedData) {
      try {
        const parseRequest: AIParseRequest = {
          brandName: brandConfig.name,
          listMarkdownContent: scrapedData.markdownContent,
          detailMarkdownContent: detail.detailMarkdownContent,
          productLink: detail.productLink,
          sourceUrl: detail.productLink.url
        };

        const parseResult = await this.aiParser.parseProducts(parseRequest);

        if (parseResult.success && parseResult.products.length > 0) {
          allProducts.push(...parseResult.products);
        } else {
          console.warn(`⚠️ [Scraper] ${detail.productLink.title} AI 解析失敗`);
        }

        // AI 請求間的延遲，避免頻率過高
        await delay(1000);

      } catch (error) {
        console.error(`❌ [Scraper] ${detail.productLink.title} 解析錯誤:`, error);
      }
    }

    // 去重處理
    const uniqueProducts = removeDuplicateProducts(allProducts);

    return uniqueProducts;
  }
}

/**
 * 提取產品連結
 */
async function extractProductLinks(page: any, brandConfig: BrandConfig): Promise<ProductLink[]> {
  const deepCrawling = brandConfig.options?.deepCrawling;
  if (!deepCrawling?.enabled || !deepCrawling.productLinkSelector) {
    return [];
  }

  try {
    const links = await page.$$eval(
      deepCrawling.productLinkSelector,
      (elements: any[], config: any) => {
        const results: ProductLink[] = [];

        for (const element of elements.slice(0, config.maxProducts || 20)) {
          try {
            const anchor = element.tagName === 'A' ? element : element.querySelector('a');
            if (!anchor) continue;

            const href = anchor.getAttribute('href');
            if (!href) continue;

            // 獲取產品資訊
            let title = '';
            let imageUrl = '';
            let price = '';
            let isNew = false;

            // 嘗試提取標題
            if (config.productTitleSelector) {
              const titleElement = element.querySelector(config.productTitleSelector);
              if (titleElement) {
                title = titleElement.textContent?.trim() || '';
              }
            }
            if (!title) {
              title = anchor.textContent?.trim() || anchor.getAttribute('title') || '';
            }

            // 嘗試提取圖片
            if (config.productImageSelector) {
              const imgElement = element.querySelector(config.productImageSelector);
              if (imgElement) {
                imageUrl = imgElement.getAttribute('src') || '';
              }
            }

            // 檢查是否為新品
            if (config.newBadgeSelector) {
              const newBadge = element.querySelector(config.newBadgeSelector);
              isNew = !!newBadge;
            }

            // 轉換為絕對 URL
            const absoluteUrl = href.startsWith('http') ? href :
              href.startsWith('/') ? `${config.baseUrl}${href}` : `${config.baseUrl}/${href}`;

            results.push({
              title: title || '未命名產品',
              url: absoluteUrl,
              imageUrl: imageUrl || undefined,
              price: price || undefined,
              isNew
            });

          } catch (error) {
            console.warn('提取產品連結時發生錯誤:', error);
          }
        }

        return results;
      },
      {
        maxProducts: deepCrawling.maxProducts || 20,
        productTitleSelector: deepCrawling.productTitleSelector,
        productImageSelector: deepCrawling.productImageSelector,
        newBadgeSelector: deepCrawling.newBadgeSelector,
        baseUrl: new URL(brandConfig.url).origin
      }
    );

    return links;

  } catch (error) {
    console.warn(`⚠️ [Scraper] 提取產品連結失敗:`, error);
    return [];
  }
}

/**
 * 執行頁面額外操作
 */
async function performPageActions(page: any, brandConfig: BrandConfig): Promise<void> {
  const actions = brandConfig.options?.actions || [];

  for (const action of actions) {
    try {
      switch (action) {
        case 'scrollToBottom':
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await page.waitForTimeout(2000);
          console.log('🔄 執行滾動到底部操作');
          break;

        case 'clickLoadMore':
          const loadMoreSelectors = ['.load-more', '.show-more', '[data-action="load-more"]', 'button:contains("もっと見る")'];
          for (const selector of loadMoreSelectors) {
            try {
              await page.click(selector);
              await page.waitForTimeout(1500);
              console.log(`👆 點擊載入更多按鈕: ${selector}`);
              break;
            } catch {
              // 忽略點擊失敗
            }
          }
          break;

        default:
          console.warn(`⚠️ 未知的頁面操作: ${action}`);
      }
    } catch (error) {
      console.warn(`⚠️ 頁面操作失敗 ${action}:`, error);
    }
  }
}

/**
 * 移除重複的產品
 */
function removeDuplicateProducts(products: ProductInfo[]): ProductInfo[] {
  const seen = new Set<string>();
  return products.filter(product => {
    const key = `${product.originalName}-${product.sourceUrl}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * 延遲函數
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 建立爬蟲服務實例
 */
export function createWebScraper(aiParser: AIParserService): WebScraper {
  return new WebScraper(aiParser);
}