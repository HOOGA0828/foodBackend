/**
 * 日本餐飲/超商品牌配置
 * 配置驅動設計，讓你可以輕鬆新增或刪除爬蟲目標
 */

export interface BrandConfig {
  /** 品牌名稱 (英文識別碼) */
  name: string;
  /** 品牌顯示名稱 */
  displayName: string;
  /** 目標網址 */
  url: string;
  /** 產品類別 */
  category: 'convenience_store' | 'restaurant' | 'fast_food' | 'bakery' | 'beverage';
  /** 頁面類型 */
  pageType: 'product_list' | 'homepage_banner' | 'campaign_page';
  /** 新品頁面選擇器 (用於定位新品區域) */
  newProductSelector?: string;
  /** 是否啟用爬蟲 */
  enabled: boolean;
  /** 爬蟲額外設定 */
  options?: {
    /** 等待頁面載入的時間 (毫秒) */
    waitFor?: number;
    /** 額外的頁面操作 (如點擊載入更多按鈕) */
    actions?: string[];
    /** 二層抓取設定 */
    deepCrawling?: {
      /** 是否啟用二層抓取 (提取連結與圖片) */
      enabled: boolean;
      /** 是否進入詳細頁面抓取內容 (若為 false 則僅使用列表頁資訊) */
      scrapeDetailPages?: boolean;
      /** 產品連結選擇器 (用於提取 href) */
      productLinkSelector?: string;
      /** 產品標題選擇器 (用於提取產品名稱) */
      productTitleSelector?: string;
      /** 產品圖片選擇器 */
      productImageSelector?: string;
      /** 新品標記選擇器 */
      newBadgeSelector?: string;
      /** 最大抓取產品數量 (避免抓取過多) */
      maxProducts?: number;
      /** 二層頁面等待時間 (毫秒) */
      detailPageWaitFor?: number;
    };
  };
}

/**
 * 支援的品牌清單
 * 新增品牌時只需在此陣列中添加配置即可
 */
export const BRANDS: BrandConfig[] = [
  {
    name: '7-Eleven',
    displayName: '7-Eleven 新品頁面(近畿)',
    url: 'https://www.sej.co.jp/products/a/thisweek/area/kinki/',
    category: 'convenience_store',
    pageType: 'product_list',
    newProductSelector: undefined, // 使用整個頁面
    enabled: true,
    options: {
      waitFor: 3000,
      actions: ['scrollToBottom'], // 滾動到底部載入更多內容
      deepCrawling: {
        enabled: true,
        scrapeDetailPages: false, // 不進入詳細頁面，直接從列表獲取
        // 修改選擇器以符合使用者需求: .list_inner -> .item_ttl / figure img
        productLinkSelector: '.list_inner', // Container
        productTitleSelector: '.item_ttl',
        productImageSelector: 'figure img',
        newBadgeSelector: '.new-badge, .badge-new, [class*="new"]',
        maxProducts: 30,
        detailPageWaitFor: 0
      }
    }
  },
  {
    name: 'familymart',
    displayName: '全家 新品頁面',
    url: 'https://www.family.co.jp/',
    category: 'convenience_store',
    pageType: 'homepage_banner',
    newProductSelector: '.new-goods-list',
    enabled: true,
    options: {
      waitFor: 2000,
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.goods-item a[href], .product-link[href]',
        productTitleSelector: '.goods-name, .product-title',
        productImageSelector: '.goods-image img, .product-image img',
        newBadgeSelector: '.new-icon, .badge-new',
        maxProducts: 20,
        detailPageWaitFor: 2000
      }
    }
  },
  {
    name: 'lawson',
    displayName: 'LAWSON',
    url: 'https://www.lawson.co.jp/recommend/new/',
    category: 'convenience_store',
    pageType: 'product_list',
    newProductSelector: '.new-item-container',
    enabled: true,
    options: {
      waitFor: 2500,
      deepCrawling: {
        enabled: true,
        // LawsonStrategy 將自行處理多日期抓取，這裡的配置主要作為參考或 fallback
        productLinkSelector: '.col-2 li a, .col-3 li a, .recommendList li a',
        productTitleSelector: '.ttl, p.text',
        productImageSelector: 'img',
        newBadgeSelector: '.new-icon',
        maxProducts: 30, // 增加數量以容納 3 個日期的產品
        detailPageWaitFor: 2000
      }
    }
  },
  {
    name: 'sushiro',
    displayName: 'sushiro',
    url: 'https://www.akindo-sushiro.co.jp/campaign/',
    category: 'restaurant',
    pageType: 'homepage_banner',
    newProductSelector: '.menu-new-items',
    enabled: true,
    options: {
      waitFor: 3000,
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.menu-item a[href], .product-link[href]',
        productTitleSelector: '.menu-title, .item-name',
        productImageSelector: '.menu-image img, .item-image img',
        newBadgeSelector: '.new-badge, .seasonal-badge',
        maxProducts: 15,
        detailPageWaitFor: 2000
      }
    }
  },
  {
    name: 'mcdonalds',
    displayName: 'mcdonalds',
    url: 'https://www.mcdonalds.co.jp/',
    category: 'fast_food',
    pageType: 'homepage_banner',
    newProductSelector: '.seasonal-menu',
    enabled: true,
    options: {
      waitFor: 3000,
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.beverage-link[href], .menu-item a[href]',
        productTitleSelector: '.beverage-name, .menu-title',
        productImageSelector: '.beverage-image img, .menu-image img',
        newBadgeSelector: '.seasonal-badge, .new-badge',
        maxProducts: 15,
        detailPageWaitFor: 2000
      }
    }
  },
  {
    name: '吉野家',
    displayName: '吉野家',
    url: 'https://www.yoshinoya.com/',
    category: 'restaurant',
    pageType: 'homepage_banner',
    newProductSelector: '.seasonal-menu',
    enabled: true,
    options: {
      waitFor: 3000,
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.beverage-link[href], .menu-item a[href]',
        productTitleSelector: '.beverage-name, .menu-title',
        productImageSelector: '.beverage-image img, .menu-image img',
        newBadgeSelector: '.seasonal-badge, .new-badge',
        maxProducts: 15,
        detailPageWaitFor: 2000
      }
    }
  },
  {
    name: 'kurasushi',
    displayName: 'kurasushi',
    url: 'https://www.kurasushi.co.jp/',
    category: 'restaurant',
    pageType: 'homepage_banner',
    newProductSelector: '.seasonal-menu',
    enabled: true,
    options: {
      waitFor: 3000,
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.beverage-link[href], .menu-item a[href]',
        productTitleSelector: '.beverage-name, .menu-title',
        productImageSelector: '.beverage-image img, .menu-image img',
        newBadgeSelector: '.seasonal-badge, .new-badge',
        maxProducts: 15,
        detailPageWaitFor: 2000
      }
    }
  },
  {
    name: 'starbucks',
    displayName: 'starbucks',
    url: 'https://www.starbucks.co.jp/',
    category: 'restaurant',
    pageType: 'homepage_banner',
    newProductSelector: '.seasonal-menu',
    enabled: true,
    options: {
      waitFor: 3000,
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.beverage-link[href], .menu-item a[href]',
        productTitleSelector: '.beverage-name, .menu-title',
        productImageSelector: '.beverage-image img, .menu-image img',
        newBadgeSelector: '.seasonal-badge, .new-badge',
        maxProducts: 15,
        detailPageWaitFor: 2000
      }
    }
  }
  // 新增更多品牌時，在此處添加...
];

/**
 * 頁面類型配置模板
 * 根據不同頁面類型提供預設的抓取參數
 */
export const PAGE_TYPE_TEMPLATES: Record<string, Omit<BrandConfig, 'name' | 'displayName' | 'url' | 'category' | 'pageType' | 'enabled'>> = {
  /** 新品資料頁面 - 圖文搭配的產品列表 */
  product_list: {
    newProductSelector: '.product-list, .new-products, .item-list, .goods-list',
    options: {
      waitFor: 3000,
      actions: ['scrollToBottom'],
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.product-item a[href], .item-card a[href], .goods-link[href]',
        productTitleSelector: '.product-name, .item-title, .goods-name, h3, h4',
        productImageSelector: '.product-image img, .item-image img, .goods-image img',
        newBadgeSelector: '.new-badge, .badge-new, .icon-new, .label-new',
        maxProducts: 20,
        detailPageWaitFor: 2000
      }
    }
  },

  /** 網站首頁 - 主要抓取 banner 區域 */
  homepage_banner: {
    newProductSelector: '.swiper, .banner, .carousel, .slider, .hero-banner, .main-banner',
    options: {
      waitFor: 2000,
      actions: [], // 首頁通常不需要額外操作
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.swiper-slide a[href], .banner-item a[href], .carousel-item a[href]',
        productTitleSelector: '.banner-title, .slide-title, .hero-title, h2, h1',
        productImageSelector: '.swiper-slide img, .banner-image img, .carousel-image img',
        newBadgeSelector: '.new-label, .campaign-badge, .seasonal-badge',
        maxProducts: 10, // banner 通常較少
        detailPageWaitFor: 2000
      }
    }
  },

  /** 活動/促銷頁面 */
  campaign_page: {
    newProductSelector: '.campaign-list, .promotion-list, .event-list, .special-offers',
    options: {
      waitFor: 3000,
      actions: ['scrollToBottom'],
      deepCrawling: {
        enabled: true,
        productLinkSelector: '.campaign-item a[href], .promo-item a[href], .event-item a[href]',
        productTitleSelector: '.campaign-title, .promo-title, .event-title',
        productImageSelector: '.campaign-image img, .promo-image img, .event-image img',
        newBadgeSelector: '.campaign-badge, .promo-badge, .limited-time',
        maxProducts: 15,
        detailPageWaitFor: 2000
      }
    }
  }
};

/**
 * 根據頁面類型獲取預設配置
 */
export function getDefaultConfigForPageType(pageType: keyof typeof PAGE_TYPE_TEMPLATES) {
  return PAGE_TYPE_TEMPLATES[pageType];
}

/**
 * 合併頁面類型預設配置和自定義配置
 */
export function createBrandConfig(
  baseConfig: Omit<BrandConfig, 'options'>,
  customOptions?: Partial<BrandConfig['options']>
): BrandConfig {
  const defaultConfig = getDefaultConfigForPageType(baseConfig.pageType);

  // 使用淺層合併，因為測試時主要關注選擇器配置
  const mergedOptions = {
    ...(defaultConfig?.options || {}),
    ...(customOptions || {})
  };

  return {
    ...baseConfig,
    ...(defaultConfig || {}),
    options: mergedOptions
  } as BrandConfig;
}

/**
 * 獲取啟用的品牌清單
 */
export function getEnabledBrands(): BrandConfig[] {
  return BRANDS.filter(brand => brand.enabled);
}

/**
 * 根據品牌名稱獲取配置
 */
export function getBrandByName(name: string): BrandConfig | undefined {
  return BRANDS.find(brand => brand.name === name);
}

/**
 * 根據類別獲取品牌清單
 */
export function getBrandsByCategory(category: BrandConfig['category']): BrandConfig[] {
  return BRANDS.filter(brand => brand.category === category && brand.enabled);
}