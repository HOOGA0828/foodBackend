import { BrandConfig } from '../config/brands.js';
import { ScraperResult } from '../types/scraper.js';
import { AIParserService } from '../services/aiParser.js';
export declare class WebScraper {
    private aiParser;
    constructor(aiParser: AIParserService);
    scrapeAndParseBrand(brandConfig: BrandConfig): Promise<ScraperResult>;
    private scrapeListPage;
    private scrapeDetailPages;
    private parseWithoutDeepCrawling;
    private parseWithImageBasedLinks;
    private parseWithDeepCrawling;
}
export declare function createWebScraper(aiParser: AIParserService): WebScraper;
//# sourceMappingURL=scraper.d.ts.map