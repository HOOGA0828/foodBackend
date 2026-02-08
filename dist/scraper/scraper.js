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
export class WebScraper {
    aiParser;
    strategies;
    constructor(aiParser) {
        this.aiParser = aiParser;
        this.strategies = new Map();
        this.registerStrategies();
    }
    registerStrategies() {
        this.strategies.set('seven-eleven', new SevenElevenStrategy(this.aiParser));
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
    async scrapeAndParseBrand(brandConfig) {
        const strategy = this.strategies.get(brandConfig.name) || new DefaultStrategy(this.aiParser);
        if (!strategy) {
            console.error(`❌ [WebScraper] Critical: Strategy for ${brandConfig.name} is undefined even after fallback!`);
        }
        console.log(`🤖 [WebScraper] 為 ${brandConfig.name} 選擇策略: ${strategy.constructor.name}`);
        console.log(`DEBUG: Invoking scrape on ${strategy?.constructor.name}`);
        const result = await strategy.scrape(brandConfig);
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
export function createWebScraper(aiParser) {
    return new WebScraper(aiParser);
}
//# sourceMappingURL=scraper.js.map