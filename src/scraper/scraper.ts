
import { BrandConfig } from '../config/brands.js';
import { ScraperResult } from '../types/scraper.js';
import { AIParserService } from '../services/aiParser.js';
import { ScraperStrategy } from './strategies/base.js';
import { SevenElevenStrategy } from './strategies/sevenEleven.js';
import { DefaultStrategy } from './strategies/default.js';

/**
 * 網頁爬蟲服務
 * 使用 Strategy Pattern 管理不同品牌的爬蟲邏輯
 */
export class WebScraper {
  private aiParser: AIParserService;
  private strategies: Map<string, ScraperStrategy>;

  constructor(aiParser: AIParserService) {
    this.aiParser = aiParser;
    this.strategies = new Map();

    // 註冊策略
    this.registerStrategies();
  }

  private registerStrategies() {
    // 註冊特定品牌策略
    this.strategies.set('7-Eleven', new SevenElevenStrategy(this.aiParser));
    // 其他品牌默認使用 DefaultStrategy，不需要顯式註冊為 key，
    // 因為 scrapeAndParseBrand 會 fallback
  }

  /**
   * 爬取並解析產品資訊
   */
  async scrapeAndParseBrand(brandConfig: BrandConfig): Promise<ScraperResult> {
    // 選擇策略
    const strategy = this.strategies.get(brandConfig.name) || new DefaultStrategy(this.aiParser);

    console.log(`🤖 [WebScraper] 為 ${brandConfig.name} 選擇策略: ${strategy.constructor.name}`);

    // 執行策略
    return await strategy.scrape(brandConfig);
  }
}

/**
 * 建立爬蟲服務實例
 */
export function createWebScraper(aiParser: AIParserService): WebScraper {
  return new WebScraper(aiParser);
}