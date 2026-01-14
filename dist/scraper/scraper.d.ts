import { BrandConfig } from '../config/brands.js';
import { ScraperResult } from '../types/scraper.js';
import { AIParserService } from '../services/aiParser.js';
export declare class WebScraper {
    private aiParser;
    private strategies;
    constructor(aiParser: AIParserService);
    private registerStrategies;
    scrapeAndParseBrand(brandConfig: BrandConfig): Promise<ScraperResult>;
}
export declare function createWebScraper(aiParser: AIParserService): WebScraper;
//# sourceMappingURL=scraper.d.ts.map