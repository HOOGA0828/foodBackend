import { BrandConfig } from '../../config/brands.js';
import { ScraperResult } from '../../types/scraper.js';
export interface ScraperStrategy {
    scrape(brandConfig: BrandConfig): Promise<ScraperResult>;
}
//# sourceMappingURL=base.d.ts.map