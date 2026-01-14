
import 'dotenv/config';
import { FamilyMartStrategy } from './scraper/strategies/familymart.js';
import { BrandConfig } from './config/brands.js';
import { createAIParserService } from './services/aiParser.js';

async function main() {
    console.log('🧪 Testing FamilyMart AI Visual Filtering Strategy');

    const aiParser = createAIParserService();
    const strategy = new FamilyMartStrategy(aiParser);

    const config: BrandConfig = {
        name: 'familymart',
        displayName: '全家 (AI 視覺篩選測試)',
        url: 'https://www.family.co.jp/goods.html',
        category: 'convenience_store',
        pageType: 'product_list',
        enabled: true,
        options: {
            deepCrawling: {
                enabled: true,
                maxProducts: 5 // 限制 5 個以節省時間
            }
        }
    };

    try {
        console.log('\n開始執行...\n');
        const result = await strategy.scrape(config);

        console.log('\n📊 執行結果:');
        console.log(`狀態: ${result.status}`);
        console.log(`產品數量: ${result.productsCount}`);
        console.log(`執行時間: ${result.executionTime}ms`);

        if (result.products.length > 0) {
            console.log('\n📦 抓取到的產品:');
            result.products.forEach((p, i) => {
                console.log(`\n${i + 1}. ${p.originalName}`);
                console.log(`   價格: ${p.price?.amount || 'N/A'}${p.price?.currency || ''}`);
                console.log(`   發售日: ${p.releaseDate || 'N/A'}`);
                console.log(`   來源: ${p.sourceUrl}`);
            });
        }

    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

main();
