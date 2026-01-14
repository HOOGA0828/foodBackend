import { BrandConfig } from '../../config/brands.js';
import { ScraperStrategy } from './base.js';
import { ScraperResult } from '../../types/scraper.js';
import { AIParserService } from '../../services/aiParser.js';
export declare class FamilyMartStrategy implements ScraperStrategy {
    private aiParser;
    constructor(aiParser: AIParserService);
    scrape(brandConfig: BrandConfig): Promise<ScraperResult>;
    private scrapeCarouselLinks;
    private scrapeDetailPages;
    private deduplicateProducts;
}
//# sourceMappingURL=familymart.d.ts.map