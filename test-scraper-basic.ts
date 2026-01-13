// 基礎爬蟲測試 - 只測試資料抓取，不包含 AI 解析
// 適合快速驗證爬蟲功能是否正常
// 用法: tsx test-scraper-basic.ts [網址1] [網址2] [網址3] ...

console.log('🎯 測試腳本已載入');

import 'dotenv/config';
import { PlaywrightCrawler } from 'crawlee';
import { BRANDS } from './dist/config/brands.js';
import { htmlToMarkdown } from './dist/utils/htmlCleaner.js';
import { getTestConfigs } from './test-urls-config.ts';

console.log('📦 依賴載入完成');

async function testBasicCrawling() {
  console.log('🧪 基礎爬蟲測試 - 驗證資料抓取功能');
  console.log('=====================================');
  console.log('用法:');
  console.log('  npm run test:scraper                    # 使用品牌配置');
  console.log('  npm run test:scraper:config            # 使用測試配置檔案');
  console.log('  tsx test-scraper-basic.ts [網址1] [網址2]  # 直接指定網址');
  console.log('');

  console.log('🔍 接收到的命令行參數:', process.argv.slice(2));

  try {
    // 從命令行參數獲取測試網址
    const args = process.argv.slice(2); // 移除 node 和腳本名稱

    let testUrls = [];
    let testConfigs = [];

    if (args.length === 1 && args[0] === 'config') {
      // 使用測試配置檔案
      const configUrls = getTestConfigs();
      if (configUrls.length === 0) {
        console.error('❌ 測試配置檔案中沒有網址，請編輯 test-urls-config.js');
        process.exit(1);
      }

      console.log(`📋 使用測試配置檔案中的 ${configUrls.length} 個網址:`);
      configUrls.forEach((config, index) => {
        console.log(`${index + 1}. ${config.displayName}: ${config.url}`);
        testUrls.push(config.url);
        testConfigs.push(config);
      });
      console.log('');

    } else if (args.length > 0) {
      // 使用命令行指定的網址
      console.log(`📋 從命令行接收到 ${args.length} 個測試網址:`);
      args.forEach((url, index) => {
        console.log(`${index + 1}. ${url}`);
        testUrls.push(url);
        testConfigs.push({
          name: `custom-${index + 1}`,
          displayName: `自定義網址 ${index + 1}`,
          url: url,
          category: 'convenience_store',
          enabled: true,
          // 使用預設的抓取配置
          options: {
            waitFor: 3000,
            deepCrawling: {
              enabled: false // 測試時預設關閉二層抓取
            }
          }
        });
      });
      console.log('');

    } else {
      // 使用品牌配置中的網址
      const enabledBrands = BRANDS.filter(b => b.enabled);
      if (enabledBrands.length === 0) {
        console.error('❌ 沒有找到啟用的品牌，請檢查 src/config/brands.ts 中的配置');
        console.log('💡 或者使用測試配置: node test-scraper-basic.js config');
        console.log('💡 或者直接指定網址: node test-scraper-basic.js https://example.com');
        process.exit(1);
      }

      // 臨時：只測試 7-Eleven
      const sevenEleven = enabledBrands.find(b => b.name === '7-Eleven');
      if (sevenEleven) {
        console.log(`📋 專門測試 7-Eleven:`);
        console.log(`1. ${sevenEleven.displayName}: ${sevenEleven.url}`);
        testUrls.push(sevenEleven.url);
        testConfigs.push(sevenEleven);
      } else {
        console.log(`📋 使用 ${enabledBrands.length} 個已配置品牌的網址進行測試:`);
        enabledBrands.forEach((brand, index) => {
          console.log(`${index + 1}. ${brand.displayName}: ${brand.url}`);
          testUrls.push(brand.url);
          testConfigs.push(brand);
        });
      }
      console.log('');
    }

    // 依序測試每個網址
    for (let i = 0; i < testUrls.length; i++) {
      const url = testUrls[i];
      const config = testConfigs[i];

      console.log(`\n🏪 開始測試網址 ${i + 1}/${testUrls.length}`);
      console.log('=====================================');
      console.log(`🏪 測試名稱: ${config.displayName}`);
      console.log(`🔗 目標網址: ${config.url}`);
      console.log(`📂 分類: ${config.category}`);
      console.log(`📄 頁面類型: ${getPageTypeDisplayName(config.pageType || 'product_list')}`);
      console.log(`🔍 二層抓取: ${config.options?.deepCrawling?.enabled ? '✅ 啟用' : '❌ 未啟用'}`);
      console.log('');

      await testSingleUrl(config);
    }

    console.log('\n🎉 所有網址測試完成！');

  } catch (error) {
    console.error('💥 測試失敗:', error);
  }
}

async function testSingleUrl(config) {
  try {
    // 建立基礎爬蟲
    const crawler = new PlaywrightCrawler({
      maxRequestsPerMinute: 5, // 測試時放慢速度
      maxConcurrency: 1,

      async requestHandler({ request, page }) {
        console.log(`🕷️ 開始抓取: ${request.url}`);

        try {
          // 1. 等待頁面載入
          console.log('⏳ 等待頁面載入...');
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(2000); // 多等一下

          // 2. 執行頁面操作 (滾動載入等)
          await performPageActions(page, config);

          // 3. 獲取 HTML 內容
          const htmlContent = await page.content();
          console.log(`📄 HTML 內容長度: ${htmlContent.length} 字元`);

          // 4. 嘗試找到新品區域
          let targetHtml = htmlContent;
          let targetSelector = '';

          if (config.newProductSelector) {
            try {
              console.log(`🎯 嘗試找到新品區域: ${config.newProductSelector}`);
              await page.waitForSelector(config.newProductSelector, { timeout: 10000 });

              const element = await page.$(config.newProductSelector);
              if (element) {
                targetHtml = await element.innerHTML();
                targetSelector = config.newProductSelector;
                console.log(`✅ 找到新品區域，使用選擇器: ${targetSelector}`);
              }
            } catch (error) {
              console.log(`⚠️ 無法找到新品選擇器 ${config.newProductSelector}，使用整個頁面`);
            }
          }

          // 5. 轉換為 Markdown
          const markdownContent = htmlToMarkdown(targetHtml);
          console.log(`📝 Markdown 內容長度: ${markdownContent.length} 字元`);

          // 6. 顯示抓取結果摘要
          displayCrawlingResults(htmlContent, targetHtml, markdownContent, targetSelector);

          // 7. 如果啟用了二層抓取，嘗試提取產品連結
          if (config.options?.deepCrawling?.enabled) {
            await testLinkExtraction(page, config);
          }

          console.log(`\n✅ ${config.displayName} 測試完成！`);

        } catch (error) {
          console.error('❌ 爬取過程發生錯誤:', error);
        }
      },

      failedRequestHandler({ request }) {
        console.error(`❌ 請求失敗: ${request.url}`);
      }
    });

    // 執行測試
    console.log('🚀 開始執行爬蟲測試...\n');
    await crawler.addRequests([{
      url: config.url,
      userData: { brandConfig: config }
    }]);

    await crawler.run();

  } catch (error) {
    console.error('💥 測試失敗:', error);
  }
}

/**
 * 執行頁面操作
 */
async function performPageActions(page, brandConfig) {
  const actions = brandConfig.options?.actions || [];

  for (const action of actions) {
    try {
      switch (action) {
        case 'scrollToBottom':
          console.log('🔄 執行: 滾動到底部載入更多內容');
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await page.waitForTimeout(2000);
          break;

        case 'clickLoadMore':
          console.log('👆 嘗試點擊載入更多按鈕');
          const selectors = ['.load-more', '.show-more', '[data-action="load-more"]', 'button:contains("もっと見る")'];
          for (const selector of selectors) {
            try {
              await page.click(selector, { timeout: 2000 });
              await page.waitForTimeout(1500);
              console.log(`  ✅ 點擊成功: ${selector}`);
              break;
            } catch {
              // 忽略點擊失敗
            }
          }
          break;

        default:
          console.log(`⚠️ 未知的頁面操作: ${action}`);
      }
    } catch (error) {
      console.warn(`⚠️ 頁面操作失敗 ${action}:`, error);
    }
  }
}

/**
 * 顯示爬取結果摘要
 */
function displayCrawlingResults(originalHtml, targetHtml, markdownContent, targetSelector) {
  console.log('\n📊 抓取結果摘要:');
  console.log('==================');
  console.log(`📄 原始 HTML 長度: ${originalHtml.length.toLocaleString()} 字元`);
  console.log(`🎯 目標區域 HTML 長度: ${targetHtml.length.toLocaleString()} 字元`);
  console.log(`📝 Markdown 長度: ${markdownContent.length.toLocaleString()} 字元`);

  if (targetSelector) {
    console.log(`✅ 使用選擇器: ${targetSelector}`);
  }

  // 顯示 Markdown 內容預覽 (前500字元)
  console.log('\n📖 Markdown 內容預覽:');
  console.log('===================');
  const preview = markdownContent.substring(0, 500);
  console.log(preview + (markdownContent.length > 500 ? '\n... (內容過長，已截斷)' : ''));

  // 估算 Token 使用量
  const estimatedTokens = Math.ceil(markdownContent.length / 4); // 粗略估算
  console.log(`\n💰 估計 Token 使用量: ${estimatedTokens.toLocaleString()} tokens`);
}

/**
 * 測試產品連結提取
 */
async function testLinkExtraction(page, brandConfig) {
  const deepCrawling = brandConfig.options?.deepCrawling;
  if (!deepCrawling?.enabled || !deepCrawling.productLinkSelector) {
    console.log('\n🔗 跳過連結提取測試 (未配置)');
    return;
  }

  console.log('\n🔗 測試產品連結提取:');
  console.log('=====================');
  console.log(`🎯 使用選擇器: ${deepCrawling.productLinkSelector}`);

  try {
    // 先檢查選擇器是否能找到任何元素
    const elementCount = await page.locator(deepCrawling.productLinkSelector).count();
    console.log(`📊 選擇器匹配到 ${elementCount} 個元素`);

    if (elementCount === 0) {
      console.log('💡 建議檢查:');
      console.log('   1. 在瀏覽器中開啟目標網址');
      console.log('   2. 按 F12 開啟開發者工具');
      console.log('   3. 在 Console 中測試選擇器:');
      console.log(`      document.querySelectorAll('${deepCrawling.productLinkSelector}')`);
      console.log('   4. 調整 test-urls-config.ts 中的選擇器');

      // 額外檢查：列出頁面上可能的產品元素
      console.log('\n🔍 額外分析：嘗試找到頁面上的產品元素...');
      await analyzePageStructure(page, brandConfig);
      return;
    }

    const links = await page.$$eval(
      deepCrawling.productLinkSelector,
      (elements, config) => {
        const results = [];

        for (const element of elements.slice(0, 5)) { // 只測試前5個
          try {
            const anchor = element.tagName === 'A' ? element : element.querySelector('a');
            if (!anchor) continue;

            const href = anchor.getAttribute('href');
            if (!href) continue;

            // 獲取產品資訊
            let title = '';
            let imageUrl = '';
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

            results.push({
              title: title || '未命名產品',
              href,
              imageUrl: imageUrl || undefined,
              isNew
            });

          } catch (error) {
            console.warn('提取連結時發生錯誤:', error);
          }
        }

        return results;
      },
      {
        productTitleSelector: deepCrawling.productTitleSelector,
        productImageSelector: deepCrawling.productImageSelector,
        newBadgeSelector: deepCrawling.newBadgeSelector
      }
    );

    console.log(`📎 成功提取 ${links.length} 個產品連結:`);

    links.forEach((link, index) => {
      console.log(`${index + 1}. ${link.title}`);
      console.log(`   連結: ${link.href}`);
      if (link.imageUrl) {
        console.log(`   圖片: ${link.imageUrl}`);
      } else {
        console.log(`   圖片: 無`);
      }
      if (link.isNew) {
        console.log(`   🆕 新品`);
      }
      console.log('');
    });

    // 額外檢查圖片選擇器
    console.log('\n🖼️  檢查圖片選擇器:');
    try {
      const images = await page.$$eval(
        deepCrawling.productImageSelector,
        (imgs: any[]) => imgs.slice(0, 10).map(img => ({
          src: img.src,
          alt: img.alt,
          className: img.className
        }))
      );

      console.log(`找到 ${images.length} 張圖片:`);
      images.forEach((img, i) => {
        console.log(`  ${i + 1}. ${img.src}`);
        if (img.alt) console.log(`     alt: ${img.alt}`);
      });

      if (images.length === 0) {
        console.log('💡 建議檢查選擇器或頁面載入是否完整');
      }
    } catch (error) {
      console.warn('檢查圖片選擇器時發生錯誤:', error);
    }

    // 轉換為絕對路徑預覽
    const baseUrl = new URL(brandConfig.url).origin;
    console.log('🔄 絕對路徑轉換預覽:');
    links.forEach((link, index) => {
      const absoluteUrl = link.href.startsWith('http') ? link.href :
        link.href.startsWith('/') ? `${baseUrl}${link.href}` : `${baseUrl}/${link.href}`;
      console.log(`${index + 1}. ${absoluteUrl}`);
    });

  } catch (error) {
    console.warn('⚠️ 連結提取測試失敗:', error);
    console.log('💡 可能的解決方案:');
    console.log('   1. 檢查選擇器語法是否正確');
    console.log('   2. 確認目標網站的 HTML 結構');
    console.log('   3. 嘗試更通用的選擇器，如: a[href], .product a, .item a');
  }
}

/**
 * 分析頁面結構，嘗試找到產品相關元素
 */
async function analyzePageStructure(page: any, brandConfig: any): Promise<void> {
  try {
    // 檢查常見的產品元素選擇器
    const commonSelectors = [
      'a[href*="product"]',
      'a[href*="item"]',
      '.product',
      '.item',
      '.goods',
      '[class*="product"]',
      '[class*="item"]',
      '[class*="goods"]',
      'img[alt*="商品"]',
      'img[alt*="製品"]',
      'img[alt*="商品"]'
    ];

    console.log('🔍 測試常見產品選擇器:');

    for (const selector of commonSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`   ✅ ${selector}: ${count} 個元素`);

          // 如果找到元素，顯示前幾個的資訊
          if (count <= 5) {
            const elements = await page.$$eval(selector, (els: any[]) =>
              els.slice(0, 3).map(el => ({
                tagName: el.tagName,
                href: el.href || el.getAttribute('href'),
                text: el.textContent?.trim().substring(0, 50),
                className: el.className,
                alt: el.alt || el.getAttribute('alt')
              }))
            );

            elements.forEach((el, i) => {
              console.log(`     ${i + 1}. ${el.tagName}${el.className ? '.' + el.className : ''}`);
              if (el.href) console.log(`        連結: ${el.href}`);
              if (el.text) console.log(`        文字: ${el.text}...`);
              if (el.alt) console.log(`        圖片說明: ${el.alt}`);
            });
          }
        }
      } catch (error) {
        // 忽略選擇器錯誤
      }
    }

    // 檢查是否有產品列表區域
    console.log('\n🔍 檢查產品列表區域:');
    const listSelectors = [
      'ul', 'ol', 'div[class*="list"]', 'div[class*="container"]',
      'section', 'article', '.products', '.items', '.goods-list',
      '.productLink', 'ul.productLink'
    ];

    for (const selector of listSelectors) {
      try {
        const count = await page.locator(selector).count();
        if (count > 0 && count <= 20) { // 只顯示合理數量的元素
          console.log(`   📋 ${selector}: ${count} 個`);

          // 特別檢查productLink
          if (selector === 'ul.productLink' || selector === '.productLink') {
            console.log('   🔗 檢查 productLink 內容:');
            const links = await page.$$eval(selector + ' a[href]', (anchors: any[]) =>
              anchors.slice(0, 5).map(a => ({
                href: a.href,
                text: a.textContent?.trim(),
                title: a.title || a.getAttribute('title')
              }))
            );

            links.forEach((link, i) => {
              console.log(`     ${i + 1}. ${link.text}`);
              console.log(`        連結: ${link.href}`);
              if (link.title) console.log(`        標題: ${link.title}`);
            });
          }
        }
      } catch (error) {
        // 忽略錯誤
      }
    }

    // 檢查頁面中的實際產品內容
    console.log('\n🔍 檢查頁面中的實際產品內容:');
    try {
      // 檢查是否有產品資訊的div或section
      const productContent = await page.$$eval('div, section, article', (elements: any[]) => {
        return elements
          .filter(el => {
            const text = el.textContent || '';
            const html = el.innerHTML || '';
            // 尋找包含產品相關關鍵字的元素
            return (text.includes('新商品') || text.includes('商品') || html.includes('img') || html.includes('price'))
              && text.length > 50; // 只顯示有內容的元素
          })
          .slice(0, 3) // 只取前3個
          .map(el => ({
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            textPreview: el.textContent?.substring(0, 100),
            hasImages: el.querySelectorAll('img').length,
            hasLinks: el.querySelectorAll('a').length
          }));
      });

      productContent.forEach((item, i) => {
        console.log(`   📦 元素 ${i + 1}: ${item.tagName}${item.className ? '.' + item.className : ''}${item.id ? '#' + item.id : ''}`);
        console.log(`      文字預覽: ${item.textPreview}...`);
        console.log(`      圖片數量: ${item.hasImages}, 連結數量: ${item.hasLinks}`);
      });

    } catch (error) {
      console.warn('檢查產品內容時發生錯誤:', error);
    }

  } catch (error) {
    console.warn('⚠️ 頁面結構分析失敗:', error);
  }
}

/**
 * 獲取頁面類型的顯示名稱
 */
function getPageTypeDisplayName(pageType: string): string {
  const typeMap = {
    'product_list': '📋 新品資料頁面',
    'homepage_banner': '🏠 網站首頁 Banner',
    'campaign_page': '🎉 活動/促銷頁面'
  };
  return typeMap[pageType] || pageType;
}

// 檢查是否直接執行此檔案
// 在 Windows 系統上，路徑分隔符號可能不同，所以我們用更簡單的方法
console.log('🚀 開始執行測試腳本...');
testBasicCrawling().catch(error => {
  console.error('💥 測試執行失敗:', error);
});