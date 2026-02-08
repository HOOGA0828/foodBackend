export interface ScrapedData {
    brandName: string;
    url: string;
    scrapedAt: Date;
    htmlContent: string;
    markdownContent: string;
    productLinks?: ProductLink[];
}
export interface ProductLink {
    title: string;
    url: string;
    imageUrl?: string;
    price?: string;
    isNew?: boolean;
    rawText?: string;
    debugInfo?: string;
}
export interface DetailedProductData {
    productLink: ProductLink;
    detailHtmlContent: string;
    detailMarkdownContent: string;
    scrapedAt: Date;
}
export interface ProductInfo {
    originalName: string;
    translatedName: string;
    originalDescription?: string;
    translatedDescription?: string;
    originalDetailedDescription?: string;
    translatedDetailedDescription?: string;
    price?: {
        amount: number;
        currency: string;
        note?: string;
    };
    category?: string;
    releaseDate?: string;
    allergens?: string[];
    nutrition?: {
        calories?: number;
        protein?: number;
        fat?: number;
        carbs?: number;
        sodium?: number;
    };
    imageUrl?: string;
    isNew?: boolean;
    sourceUrl: string;
}
export interface ScraperResult {
    brand: {
        name: string;
        displayName: string;
        category: string;
        url: string;
    };
    productsCount: number;
    products: ProductInfo[];
    status: 'success' | 'partial_success' | 'failed';
    errorMessage?: string;
    executionTime: number;
    scrapedAt: Date;
}
export interface AIParseRequest {
    brandName: string;
    listMarkdownContent: string;
    detailMarkdownContent?: string;
    productLink?: ProductLink;
    sourceUrl: string;
}
export interface AIParseResponse {
    success: boolean;
    products: ProductInfo[];
    errorMessage?: string;
    tokenUsage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
//# sourceMappingURL=scraper.d.ts.map