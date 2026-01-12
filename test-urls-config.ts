// 測試網址配置檔案
// 在這裡添加您想要測試的網址，每個網址可以設定不同的抓取配置

import { createBrandConfig } from './dist/config/brands.js';

export const TEST_URLS = [
  // ===== 新品資料頁面範例 =====
  createBrandConfig({
    name: '7eleven-products',
    displayName: '7-Eleven 新品頁面(近畿)',
    url: 'https://www.sej.co.jp/products/a/thisweek/area/kinki/',
    category: 'convenience_store',
    pageType: 'product_list',
    enabled: true
  }, {
    // 自定義選擇器 - 先測試基本功能
    newProductSelector: '.new-product-list, .product-list',
    deepCrawling: {
      enabled: true,
      productLinkSelector: 'a[href*="product"], .product-item a, .item a',
      productTitleSelector: '.product-name, .item-title, h3, h4',
      maxProducts: 5 // 先測試少量產品
    }
  }),

  createBrandConfig({
    name: 'family',
    displayName: '全家 新品頁面',
    url: 'https://www.family.co.jp/goods.html',
    category: 'convenience_store',
    pageType: 'product_list',
    enabled: true
  }),

  // ===== 網站首頁範例 =====
  createBrandConfig({
    name: 'lawson-homepage',
    displayName: 'lawson 首頁 Banner',
    url: 'https://www.lawson.co.jp/index.html',
    category: 'restaurant',
    pageType: 'homepage_banner',
    enabled: true
  }),

  createBrandConfig({
    name: 'sushiro-homepage',
    displayName: 'sushiro 首頁 Banner',
    url: 'https://www.akindo-sushiro.co.jp/campaign/',
    category: 'fast_food',
    pageType: 'homepage_banner',
    enabled: true
  }),

  createBrandConfig({
    name: 'mcdonalds-homepage',
    displayName: 'mcdonalds 首頁 Banner',
    url: 'https://www.mcdonalds.co.jp/',
    category: 'fast_food',
    pageType: 'homepage_banner',
    enabled: true
  }),

  createBrandConfig({
    name: 'yoshinoya-homepage',
    displayName: '吉野家 首頁 Banner',
    url: 'https://www.yoshinoya.com/',
    category: 'fast_food',
    pageType: 'homepage_banner',
    enabled: true
  }),

  createBrandConfig({
    name: 'kurasushi-homepage',
    displayName: 'kurasushi 首頁 Banner',
    url: 'https://www.kurasushi.co.jp/',
    category: 'fast_food',
    pageType: 'homepage_banner',
    enabled: true
  }),

  

  // ===== 自定義配置範例 =====
  createBrandConfig({
    name: 'custom-campaign',
    displayName: '自定義活動頁面',
    url: 'https://example.com/campaign',
    category: 'convenience_store',
    pageType: 'campaign_page',
    enabled: true
  }, {
    // 自定義覆蓋預設配置
    waitFor: 5000, // 等待更長時間
    deepCrawling: {
      enabled: true,
      maxProducts: 5 // 只抓取前5個
    }
  }),

  // ===== 完全自定義配置 =====
  {
    name: 'fully-custom',
    displayName: '完全自定義網站',
    url: 'https://example.com/custom',
    category: 'bakery',
    pageType: 'product_list',
    enabled: true,
    newProductSelector: '.my-custom-products', // 完全自定義選擇器
    options: {
      waitFor: 3000,
      actions: ['clickLoadMore', 'scrollToBottom'],
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.my-product-link',
        productTitleSelector: '.my-product-title',
        productImageSelector: '.my-product-img',
        newBadgeSelector: '.my-new-badge',
        maxProducts: 25,
        detailPageWaitFor: 3000
      }
    }
  }
];

// 使用方法：
// 1. 在上面添加您的測試網址
// 2. 執行: npm run test:scraper:config
// 3. 或指定特定網址: npx tsx test-scraper-basic.ts https://example.com

// ===== 選擇器測試建議 =====
// 如果產品連結提取不到東西，請按以下步驟調整：
//
// 1. 在瀏覽器中開啟目標網址
// 2. 按 F12 開啟開發者工具
// 3. 在 Console 中測試以下選擇器：
//
//    // 通用連結選擇器
//    document.querySelectorAll('a[href]')
//    document.querySelectorAll('.product a, .item a, .card a')
//
//    // 常見的產品容器
//    document.querySelectorAll('.product-item, .item, .card, .product')
//    document.querySelectorAll('[class*="product"], [class*="item"]')
//
// 4. 找到正確的選擇器後，在此檔案中更新對應的配置

export function getTestConfigs() {
  return TEST_URLS;
}

export function getTestConfigByName(name) {
  return TEST_URLS.find(config => config.name === name);
}

// ===== 常用選擇器參考 =====
// 產品連結: 'a[href], .product a, .item a, .card a'
// 產品名稱: '.product-name, .item-title, .card-title, h3, h4'
// 產品圖片: 'img, .product-image img, .item-image img'
// 新品標記: '.new, .badge-new, [class*="new"]'