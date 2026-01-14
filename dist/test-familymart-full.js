import 'dotenv/config';
import { FamilyMartStrategy } from './scraper/strategies/familymart.js';
import { createAIParserService } from './services/aiParser.js';
async function main() {
    console.log('🧪 完整測試 FamilyMart AI 視覺篩選');
    const aiParser = createAIParserService();
    const strategy = new FamilyMartStrategy(aiParser);
    const config = {
        name: 'familymart',
        displayName: '全家 (完整測試)',
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
        console.log('\n開始執行完整流程...\n');
        const result = await strategy.scrape(config);
        console.log('\n' + '='.repeat(50));
        console.log('📊 最終執行結果');
        console.log('='.repeat(50));
        console.log(`狀態: ${result.status}`);
        console.log(`產品數量: ${result.productsCount}`);
        console.log(`執行時間: ${(result.executionTime / 1000).toFixed(1)}秒`);
        if (result.errorMessage) {
            console.log(`錯誤訊息: ${result.errorMessage}`);
        }
        if (result.products.length > 0) {
            console.log('\n📦 成功抓取的產品:');
            result.products.forEach((p, i) => {
                console.log(`\n${i + 1}. ${p.originalName}`);
                console.log(`   翻譯: ${p.translatedName}`);
                console.log(`   價格: ${p.price?.amount || 'N/A'}${p.price?.currency || ''}`);
                console.log(`   發售日: ${p.releaseDate || 'N/A'}`);
                console.log(`   圖片: ${p.imageUrl || 'N/A'}`);
                console.log(`   來源: ${p.sourceUrl}`);
            });
        }
        else {
            console.log('\n⚠️ 未抓取到任何產品');
            console.log('可能原因：');
            console.log('1. AI 判斷所有輪播項目都不是食物');
            console.log('2. 詳細頁面選擇器需要調整');
            console.log('3. 頁面結構已變更');
        }
    }
    catch (error) {
        console.error('\n❌ 測試失敗:', error);
    }
}
main();
//# sourceMappingURL=test-familymart-full.js.map