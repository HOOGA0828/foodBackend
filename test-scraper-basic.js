// 基礎爬蟲測試 - 只測試資料抓取，不包含 AI 解析
// 適合快速驗證爬蟲功能是否正常
// 用法: node test-scraper-basic.js [網址1] [網址2] [網址3] ...
import 'dotenv/config';
import { PlaywrightCrawler } from 'crawlee';
import { BRANDS } from './src/config/brands.js';
import { htmlToMarkdown } from './src/utils/htmlCleaner.js';
import { getTestConfigs } from './test-urls-config.ts';
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
        }
        else if (args.length > 0) {
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
        }
        else {
            // 使用品牌配置中的網址
            const enabledBrands = BRANDS.filter(b => b.enabled);
            if (enabledBrands.length === 0) {
                console.error('❌ 沒有找到啟用的品牌，請檢查 src/config/brands.ts 中的配置');
                console.log('💡 或者使用測試配置: node test-scraper-basic.js config');
                console.log('💡 或者直接指定網址: node test-scraper-basic.js https://example.com');
                process.exit(1);
            }
            console.log(`📋 使用 ${enabledBrands.length} 個已配置品牌的網址進行測試:`);
            enabledBrands.forEach((brand, index) => {
                console.log(`${index + 1}. ${brand.displayName}: ${brand.url}`);
                testUrls.push(brand.url);
                testConfigs.push(brand);
            });
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
            console.log(`🔍 二層抓取: ${config.options?.deepCrawling?.enabled ? '✅ 啟用' : '❌ 未啟用'}`);
            console.log('');
            await testSingleUrl(config);
        }
        console.log('\n🎉 所有網址測試完成！');
    }
    catch (error) {
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
                        }
                        catch (error) {
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
                }
                catch (error) {
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
    }
    catch (error) {
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
                        }
                        catch {
                            // 忽略點擊失敗
                        }
                    }
                    break;
                default:
                    console.log(`⚠️ 未知的頁面操作: ${action}`);
            }
        }
        catch (error) {
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
    try {
        const links = await page.$$eval(deepCrawling.productLinkSelector, (elements, config) => {
            const results = [];
            for (const element of elements.slice(0, 5)) { // 只測試前5個
                try {
                    const anchor = element.tagName === 'A' ? element : element.querySelector('a');
                    if (!anchor)
                        continue;
                    const href = anchor.getAttribute('href');
                    if (!href)
                        continue;
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
                }
                catch (error) {
                    console.warn('提取連結時發生錯誤:', error);
                }
            }
            return results;
        }, {
            productTitleSelector: deepCrawling.productTitleSelector,
            productImageSelector: deepCrawling.productImageSelector,
            newBadgeSelector: deepCrawling.newBadgeSelector
        });
        console.log(`📎 找到 ${links.length} 個產品連結:`);
        links.forEach((link, index) => {
            console.log(`${index + 1}. ${link.title}`);
            console.log(`   連結: ${link.href}`);
            if (link.imageUrl) {
                console.log(`   圖片: ${link.imageUrl}`);
            }
            if (link.isNew) {
                console.log(`   🆕 新品`);
            }
            console.log('');
        });
        // 轉換為絕對路徑預覽
        const baseUrl = new URL(brandConfig.url).origin;
        console.log('🔄 絕對路徑轉換預覽:');
        links.forEach((link, index) => {
            const absoluteUrl = link.href.startsWith('http') ? link.href :
                link.href.startsWith('/') ? `${baseUrl}${link.href}` : `${baseUrl}/${link.href}`;
            console.log(`${index + 1}. ${absoluteUrl}`);
        });
    }
    catch (error) {
        console.warn('⚠️ 連結提取測試失敗:', error);
    }
}
// 檢查是否直接執行此檔案
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('🚀 開始執行測試腳本...');
    testBasicCrawling();
}
