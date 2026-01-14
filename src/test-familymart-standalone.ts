
import 'dotenv/config';
import { FamilyMartStrategy } from './scraper/strategies/familymart.js';
import { BrandConfig } from './config/brands.js';
import { AIParserService } from './services/aiParser.js';

async function main() {
    console.log('Testing FamilyMart Strategy Standalone');

    // Mock dependencies
    const mockAiParser = {} as AIParserService;
    const strategy = new FamilyMartStrategy(mockAiParser);

    const config: BrandConfig = {
        name: 'familymart',
        displayName: '全家',
        url: 'https://www.family.co.jp/goods.html',
        category: 'convenience_store',
        pageType: 'product_list',
        enabled: true,
        options: {
            deepCrawling: {
                enabled: true,
                maxProducts: 3
            }
        }
    };

    try {
        const result = await strategy.scrape(config);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
