import { SevenElevenStrategy } from './scraper/strategies/sevenEleven.js';
import { AIParserService } from './services/aiParser.js';
class MockAIParser extends AIParserService {
    async parseProducts(request) {
        return {
            success: true,
            products: [{
                    originalName: request.productLink.title,
                    translatedName: "Mock Product",
                    price: { amount: 100, currency: "JPY" },
                    imageUrl: request.productLink.imageUrl,
                    isNew: true
                }]
        };
    }
}
(async () => {
    try {
        console.log('🚀 Testing SevenElevenStrategy Pagination...');
        const mockAI = new MockAIParser('mock-key');
        const strategy = new SevenElevenStrategy(mockAI);
        const config = {
            name: '7-Eleven',
            displayName: '7-Eleven Test',
            category: 'convenience-store',
            url: 'https://www.sej.co.jp/products/a/thisweek/area/kinki/',
            options: {
                deepCrawling: { enabled: true, scrapeDetailPages: false }
            }
        };
        const result = await strategy.scrape(config);
        console.log(`\n🎉 Test Completed!`);
        console.log(`Total Products Found: ${result.productsCount}`);
        if (result.productsCount > 30) {
            console.log('✅ Pagination definitely worked (Found > 30 products)');
        }
        else {
            console.log('⚠️ Count is low, check if pagination actually triggered or if page count is small.');
        }
    }
    catch (e) {
        console.error('❌ Strategy Execution Failed:', e);
    }
})();
//# sourceMappingURL=test-pagination-strategy.js.map