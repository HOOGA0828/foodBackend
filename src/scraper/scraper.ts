
import { BrandConfig } from '../config/brands.js';
import { ScraperResult } from '../types/scraper.js';
import { AIParserService } from '../services/aiParser.js';
import { ScraperStrategy } from './strategies/base.js';
import { SevenElevenStrategy } from './strategies/sevenEleven.js';
import { FamilyMartStrategy } from './strategies/familymart.js';
import { DefaultStrategy } from './strategies/default.js';
import { LawsonStrategy } from './strategies/lawson.js';
import { McdonaldsStrategy } from './strategies/mcdonalds.js';
import { YoshinoyaStrategy } from './strategies/yoshinoya.js';
import { SukiyaStrategy } from './strategies/sukiya.js';
import { MatsuyaStrategy } from './strategies/matsuya.js';
import { KfcStrategy } from './strategies/kfc.js';

import { MosBurgerStrategy } from './strategies/MosBurgerStrategy.js';
import { StarbucksStrategy } from './strategies/starbucks.js';

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
    this.strategies.set('familymart', new FamilyMartStrategy(this.aiParser));
    this.strategies.set('lawson', new LawsonStrategy(this.aiParser));
    this.strategies.set('mcdonalds', new McdonaldsStrategy(this.aiParser));
    this.strategies.set('吉野家', new YoshinoyaStrategy(this.aiParser));
    this.strategies.set('sukiya', new SukiyaStrategy(this.aiParser));
    this.strategies.set('Matsuya', new MatsuyaStrategy(this.aiParser));
    this.strategies.set('KFC', new KfcStrategy(this.aiParser));
    this.strategies.set('mos_burger', new MosBurgerStrategy(this.aiParser));
    this.strategies.set('starbucks', new StarbucksStrategy(this.aiParser));
  }

  /**
   * 爬取並解析產品資訊
   */
  async scrapeAndParseBrand(brandConfig: BrandConfig): Promise<ScraperResult> {
    // 選擇策略
    const strategy = this.strategies.get(brandConfig.name) || new DefaultStrategy(this.aiParser);

    if (!strategy) {
      console.error(`❌ [WebScraper] Critical: Strategy for ${brandConfig.name} is undefined even after fallback!`);
    }

    console.log(`🤖 [WebScraper] 為 ${brandConfig.name} 選擇策略: ${strategy.constructor.name}`);

    // 執行策略
    console.log(`DEBUG: Invoking scrape on ${strategy?.constructor.name}`);
    const result = await strategy.scrape(brandConfig);

    // 全域過濾：排除沒有價格的產品
    if (result.products && result.products.length > 0) {
      const originalCount = result.products.length;
      result.products = result.products.filter(p => p.price && typeof p.price.amount === 'number');
      const filteredCount = result.products.length;

      if (originalCount !== filteredCount) {
        console.log(`🧹 [Global Filter] 已移除 ${originalCount - filteredCount} 筆無價格商品 (剩餘 ${filteredCount} 筆)`);
        result.productsCount = filteredCount;
      }
    }

    return result;
  }
}

/**
 * 建立爬蟲服務實例
 */
export function createWebScraper(aiParser: AIParserService): WebScraper {
  return new WebScraper(aiParser);
}