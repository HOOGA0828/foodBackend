import { SevenElevenStrategy } from './strategies/sevenEleven.js';
import { FamilyMartStrategy } from './strategies/familymart.js';
import { DefaultStrategy } from './strategies/default.js';
import { LawsonStrategy } from './strategies/lawson.js';
export class WebScraper {
    aiParser;
    strategies;
    constructor(aiParser) {
        this.aiParser = aiParser;
        this.strategies = new Map();
        this.registerStrategies();
    }
    registerStrategies() {
        this.strategies.set('7-Eleven', new SevenElevenStrategy(this.aiParser));
        this.strategies.set('familymart', new FamilyMartStrategy(this.aiParser));
        this.strategies.set('lawson', new LawsonStrategy(this.aiParser));
    }
    async scrapeAndParseBrand(brandConfig) {
        const strategy = this.strategies.get(brandConfig.name) || new DefaultStrategy(this.aiParser);
        console.log(`🤖 [WebScraper] 為 ${brandConfig.name} 選擇策略: ${strategy.constructor.name}`);
        return await strategy.scrape(brandConfig);
    }
}
export function createWebScraper(aiParser) {
    return new WebScraper(aiParser);
}
//# sourceMappingURL=scraper.js.map