/**
 * 日本餐飲/超商品牌配置
 * 配置驅動設計，讓你可以輕鬆新增或刪除爬蟲目標
 */
/**
 * 支援的品牌清單
 * 新增品牌時只需在此陣列中添加配置即可
 */
export const BRANDS = [
    {
        name: '7eleven',
        displayName: '7-Eleven',
        url: 'https://www.sej.co.jp/products/new/',
        category: 'convenience_store',
        newProductSelector: '.new-product-list',
        enabled: true,
        options: {
            waitFor: 3000,
            actions: ['scrollToBottom'], // 滾動到底部載入更多內容
            deepCrawling: {
                enabled: true,
                productLinkSelector: '.product-item a[href], .new-product-item a[href]',
                productTitleSelector: '.product-name, .item-title, h3, h4',
                productImageSelector: '.product-image img, .item-image img',
                newBadgeSelector: '.new-badge, .badge-new',
                maxProducts: 20,
                detailPageWaitFor: 2000
            }
        }
    },
    {
        name: 'familymart',
        displayName: 'FamilyMart',
        url: 'https://www.family.co.jp/goods/new.html',
        category: 'convenience_store',
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
        newProductSelector: '.new-item-container',
        enabled: true,
        options: {
            waitFor: 2500,
            actions: ['clickLoadMore'], // 點擊載入更多按鈕
            deepCrawling: {
                enabled: true,
                productLinkSelector: '.item-link[href], .product-card a[href]',
                productTitleSelector: '.item-title, .product-name',
                productImageSelector: '.item-image img, .product-image img',
                newBadgeSelector: '.new-label, .badge-new',
                maxProducts: 20,
                detailPageWaitFor: 2000
            }
        }
    },
    {
        name: 'mcdonalds',
        displayName: 'McDonald\'s',
        url: 'https://www.mcdonalds.co.jp/menu/',
        category: 'fast_food',
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
        name: 'starbucks',
        displayName: 'Starbucks',
        url: 'https://www.starbucks.co.jp/menu/',
        category: 'beverage',
        newProductSelector: '.seasonal-menu',
        enabled: true,
        options: {
            waitFor: 2000,
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
 * 獲取啟用的品牌清單
 */
export function getEnabledBrands() {
    return BRANDS.filter(brand => brand.enabled);
}
/**
 * 根據品牌名稱獲取配置
 */
export function getBrandByName(name) {
    return BRANDS.find(brand => brand.name === name);
}
/**
 * 根據類別獲取品牌清單
 */
export function getBrandsByCategory(category) {
    return BRANDS.filter(brand => brand.category === category && brand.enabled);
}
