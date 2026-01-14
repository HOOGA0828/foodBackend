export interface BrandConfig {
    name: string;
    displayName: string;
    url: string;
    category: 'convenience_store' | 'restaurant' | 'fast_food' | 'bakery' | 'beverage';
    pageType: 'product_list' | 'homepage_banner' | 'campaign_page';
    newProductSelector?: string;
    enabled: boolean;
    options?: {
        waitFor?: number;
        actions?: string[];
        deepCrawling?: {
            enabled: boolean;
            scrapeDetailPages?: boolean;
            productLinkSelector?: string;
            productTitleSelector?: string;
            productImageSelector?: string;
            newBadgeSelector?: string;
            maxProducts?: number;
            detailPageWaitFor?: number;
        };
    };
}
export declare const BRANDS: BrandConfig[];
export declare const PAGE_TYPE_TEMPLATES: Record<string, Omit<BrandConfig, 'name' | 'displayName' | 'url' | 'category' | 'pageType' | 'enabled'>>;
export declare function getDefaultConfigForPageType(pageType: keyof typeof PAGE_TYPE_TEMPLATES): Omit<BrandConfig, "name" | "enabled" | "displayName" | "url" | "category" | "pageType"> | undefined;
export declare function createBrandConfig(baseConfig: Omit<BrandConfig, 'options'>, customOptions?: Partial<BrandConfig['options']>): BrandConfig;
export declare function getEnabledBrands(): BrandConfig[];
export declare function getBrandByName(name: string): BrandConfig | undefined;
export declare function getBrandsByCategory(category: BrandConfig['category']): BrandConfig[];
//# sourceMappingURL=brands.d.ts.map