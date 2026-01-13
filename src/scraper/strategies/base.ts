
import { BrandConfig } from '../../config/brands.js';
import { ScraperResult } from '../../types/scraper.js';

/**
 * 爬蟲策略介面
 * 每個品牌的爬蟲邏輯都應該實現此介面
 */
export interface ScraperStrategy {
    /**
     * 執行爬蟲
     * @param brandConfig 品牌配置
     */
    scrape(brandConfig: BrandConfig): Promise<ScraperResult>;
}
