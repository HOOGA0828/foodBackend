export const BRANDS = [
    {
        name: 'seven-eleven',
        displayName: '7-Eleven',
        url: 'https://www.sej.co.jp/products/a/thisweek/area/kinki/',
        category: 'convenience_store',
        pageType: 'product_list',
        newProductSelector: undefined,
        enabled: true,
        options: {
            waitFor: 3000,
            actions: ['scrollToBottom'],
            deepCrawling: {
                enabled: true,
                scrapeDetailPages: false,
                productLinkSelector: '.list_inner',
                productTitleSelector: '.item_ttl',
                productImageSelector: 'figure img',
                newBadgeSelector: '.new-badge, .badge-new, [class*="new"]',
                detailPageWaitFor: 0
            }
        }
    },
    {
        name: 'familymart',
        displayName: 'FamilyMart',
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
        displayName: 'Lawson',
        url: 'https://www.lawson.co.jp/recommend/new/',
        category: 'convenience_store',
        pageType: 'product_list',
        newProductSelector: '.new-item-container',
        enabled: true,
        options: {
            waitFor: 2500,
            deepCrawling: {
                enabled: true,
                productLinkSelector: '.col-2 li a, .col-3 li a, .recommendList li a',
                productTitleSelector: '.ttl, p.text',
                productImageSelector: 'img',
                newBadgeSelector: '.new-icon',
                maxProducts: 30,
                detailPageWaitFor: 2000
            }
        }
    },
    {
        name: 'mcdonalds',
        displayName: 'McDonald\'s',
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
        name: 'yoshinoya',
        displayName: '吉野家',
        url: 'https://www.yoshinoya.com/',
        category: 'restaurant',
        pageType: 'homepage_banner',
        newProductSelector: '.r-menu__wrapper .swiper-wrapper',
        enabled: true,
        options: {
            waitFor: 3000,
            deepCrawling: {
                enabled: true,
                scrapeDetailPages: true,
                productLinkSelector: '.r-menu__wrapper .swiper-slide:not(.swiper-slide-duplicate) a',
                productTitleSelector: '.rcmd__text p',
                productImageSelector: 'img',
                newBadgeSelector: '.new-badge',
                maxProducts: 10,
                detailPageWaitFor: 2000
            }
        }
    },
    {
        name: 'sukiya',
        displayName: 'すき家',
        url: 'https://www.sukiya.jp/',
        category: 'restaurant',
        pageType: 'product_list',
        newProductSelector: '',
        enabled: true,
        options: {
            waitFor: 3000,
            deepCrawling: {
                enabled: true,
                scrapeDetailPages: true
            }
        }
    },
    {
        name: 'starbucks',
        displayName: 'Starbucks',
        url: 'https://product.starbucks.co.jp/beverage/?nid=mm',
        url2: 'https://product.starbucks.co.jp/food/?nid=mm',
        category: 'restaurant',
        pageType: 'product_list',
        newProductSelector: '.card-wrap.main-wrap.category-main-layout',
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
        name: 'matsuya',
        displayName: '松屋',
        url: 'https://www.matsuyafoods.co.jp/matsuya/menu/limited/index.html',
        category: 'restaurant',
        pageType: 'product_list',
        newProductSelector: '.menu-list',
        enabled: true,
        options: {
            waitFor: 3000,
            deepCrawling: {
                enabled: true,
                scrapeDetailPages: false
            }
        }
    },
    {
        name: 'kfc',
        displayName: 'KFC',
        url: 'https://www.kfc.co.jp/menu/',
        category: 'fast_food',
        pageType: 'product_list',
        newProductSelector: '#campaign',
        enabled: true,
        options: {
            waitFor: 5000,
            actions: ['scrollToBottom'],
            deepCrawling: {
                enabled: true,
                scrapeDetailPages: false,
                productLinkSelector: '#campaign a[href*="/menu/"]',
                productTitleSelector: 'h2, h3, .title, .name',
                productImageSelector: '#campaign img',
                newBadgeSelector: '.new, .badge-new, [class*="new"]',
                maxProducts: 30
            }
        }
    },
    {
        name: 'mos-burger',
        displayName: '摩斯漢堡',
        url: 'https://www.mos.jp/menu/',
        category: 'fast_food',
        pageType: 'product_list',
        newProductSelector: '.menu-recommend',
        enabled: true,
        options: {
            waitFor: 3000,
            deepCrawling: {
                enabled: false,
                scrapeDetailPages: false
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