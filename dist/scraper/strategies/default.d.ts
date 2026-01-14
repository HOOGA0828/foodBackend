import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';
export declare class DefaultStrategy implements ScraperStrategy {
    private aiParser;
    constructor(aiParser: AIParserService);
    scrape(brandConfig: BrandConfig): Promise<ScraperResult>;
    private scrapeListPage;
    private scrapeDetailPages;
    private extractProductLinks;
    private extractPageImages;
    private performPageActions;
    private parseWithListLinks;
    private parseWithoutDeepCrawling;
    private parseWithDeepCrawling;
    private parseWithImageBasedLinks;
    private removeDuplicateProducts;
}
//# sourceMappingURL=default.d.ts.map