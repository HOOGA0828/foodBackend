export const BRANDS = [
    {
        name: '7eleven',
        displayName: '7-Eleven',
        url: 'https://www.sej.co.jp/products/new/',
        category: 'convenience_store',
        pageType: 'product_list',
        newProductSelector: '.new-product-list',
        enabled: true,
        options: {
            waitFor: 3000,
            actions: ['scrollToBottom'],
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
        pageType: 'product_list',
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
            actions: ['clickLoadMore'],
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
        pageType: 'product_list',
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
        pageType: 'product_list',
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
];
export const PAGE_TYPE_TEMPLATES = {
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
    homepage_banner: {
        newProductSelector: '.swiper, .banner, .carousel, .slider, .hero-banner, .main-banner',
        options: {
            waitFor: 2000,
            actions: [],
            deepCrawling: {
                enabled: true,
                productLinkSelector: '.swiper-slide a[href], .banner-item a[href], .carousel-item a[href]',
                productTitleSelector: '.banner-title, .slide-title, .hero-title, h2, h1',
                productImageSelector: '.swiper-slide img, .banner-image img, .carousel-image img',
                newBadgeSelector: '.new-label, .campaign-badge, .seasonal-badge',
                maxProducts: 10,
                detailPageWaitFor: 2000
            }
        }
    },
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
export function getDefaultConfigForPageType(pageType) {
    return PAGE_TYPE_TEMPLATES[pageType];
}
export function createBrandConfig(baseConfig, customOptions) {
    const defaultConfig = getDefaultConfigForPageType(baseConfig.pageType);
    const mergedOptions = {
        ...(defaultConfig?.options || {}),
        ...(customOptions || {})
    };
    return {
        ...baseConfig,
        ...(defaultConfig || {}),
        options: mergedOptions
    };
}
export function getEnabledBrands() {
    return BRANDS.filter(brand => brand.enabled);
}
export function getBrandByName(name) {
    return BRANDS.find(brand => brand.name === name);
}
export function getBrandsByCategory(category) {
    return BRANDS.filter(brand => brand.category === category && brand.enabled);
}
//# sourceMappingURL=brands.js.map