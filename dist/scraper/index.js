#!/usr/bin/env node
import 'dotenv/config';
import { getEnabledBrands, getBrandByName, BRANDS } from '../config/brands.js';
import { pathToFileURL } from 'url';
import { createAIParserService } from '../services/aiParser.js';
import { createWebScraper } from './scraper.js';
import { createSupabaseService } from '../services/supabase.js';
async function main() {
    console.log('🇯🇵 日本新品追蹤爬蟲系統啟動');
    console.log('================================');
    try {
        console.log('🚀 程式開始執行...');
        console.log('🔧 初始化服務...');
        const aiParser = createAIParserService();
        const scraper = createWebScraper(aiParser);
        const supabaseService = createSupabaseService();
        const targetBrands = getTargetBrands();
        console.log(`🔍 找到 ${targetBrands.length} 個目標品牌`);
        if (targetBrands.length === 0) {
            console.log('❌ 沒有找到啟用的品牌配置');
            console.log('💡 請檢查 src/config/brands.ts 中的 enabled 設定');
            const allBrands = BRANDS;
            console.log('\n📋 所有品牌的狀態:');
            allBrands.forEach(brand => {
                console.log(`  ${brand.enabled ? '✅' : '❌'} ${brand.name}: ${brand.displayName}`);
            });
            process.exit(1);
        }
        console.log(`📋 將處理 ${targetBrands.length} 個品牌:`);
        targetBrands.forEach(brand => {
            console.log(`  • ${brand.displayName} (${brand.category})`);
        });
        console.log('');
        const results = [];
        const startTime = Date.now();
        for (const brand of targetBrands) {
            try {
                console.log(`\n🏪 開始處理 ${brand.displayName}...`);
                const result = await scraper.scrapeAndParseBrand(brand);
                results.push(result);
                displayResultSummary(result);
            }
            catch (error) {
                console.error(`❌ 處理 ${brand.displayName} 時發生錯誤:`, error);
                results.push({
                    brand: {
                        name: brand.name,
                        displayName: brand.displayName,
                        category: brand.category,
                        url: brand.url
                    },
                    productsCount: 0,
                    products: [],
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : '未知錯誤',
                    executionTime: 0,
                    scrapedAt: new Date()
                });
            }
            if (targetBrands.length > 1) {
                await delay(2000);
            }
        }
        displayFinalReport(results, Date.now() - startTime);
        await saveResultsToSupabase(results, supabaseService);
        outputResultsForSupabase(results);
    }
    catch (error) {
        console.error('💥 系統錯誤:', error);
        process.exit(1);
    }
}
function getTargetBrands() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        return getEnabledBrands();
    }
    const targetBrands = [];
    for (const arg of args) {
        const brand = getBrandByName(arg);
        if (brand && brand.enabled) {
            targetBrands.push(brand);
        }
        else {
            console.warn(`⚠️ 找不到啟用的品牌: ${arg}`);
        }
    }
    return targetBrands;
}
function displayResultSummary(result) {
    const statusEmoji = result.status === 'success' ? '✅' :
        result.status === 'partial_success' ? '⚠️' : '❌';
    console.log(`${statusEmoji} ${result.brand.displayName} 處理完成`);
    console.log(`   📊 產品數量: ${result.productsCount}`);
    console.log(`   ⏱️ 執行時間: ${result.executionTime}ms`);
    console.log(`   📅 爬取時間: ${result.scrapedAt.toLocaleString('zh-TW')}`);
    if (result.errorMessage) {
        console.log(`   ❌ 錯誤訊息: ${result.errorMessage}`);
    }
    if (result.products.length > 0) {
        console.log(`   📦 產品預覽:`);
        result.products.slice(0, 3).forEach((product, index) => {
            const priceInfo = product.price ?
                `${product.price.amount}${product.price.currency}${product.price.note ? `(${product.price.note})` : ''}` :
                '價格未設定';
            console.log(`     ${index + 1}. ${product.translatedName} - ${priceInfo}`);
        });
        if (result.products.length > 3) {
            console.log(`     ...還有 ${result.products.length - 3} 個產品`);
        }
    }
}
function displayFinalReport(results, totalTime) {
    console.log('\n📊 總結報告');
    console.log('============');
    const totalProducts = results.reduce((sum, r) => sum + r.productsCount, 0);
    const successfulBrands = results.filter(r => r.status === 'success').length;
    const partialSuccessBrands = results.filter(r => r.status === 'partial_success').length;
    const failedBrands = results.filter(r => r.status === 'failed').length;
    console.log(`⏱️ 總執行時間: ${(totalTime / 1000).toFixed(1)}秒`);
    console.log(`🏪 處理品牌數: ${results.length}個`);
    console.log(`📦 總產品數量: ${totalProducts}個`);
    console.log(`✅ 完全成功: ${successfulBrands}個品牌`);
    console.log(`⚠️ 部分成功: ${partialSuccessBrands}個品牌`);
    console.log(`❌ 失敗: ${failedBrands}個品牌`);
    const failedResults = results.filter(r => r.status === 'failed');
    if (failedResults.length > 0) {
        console.log('\n❌ 失敗的品牌:');
        failedResults.forEach(result => {
            console.log(`   • ${result.brand.displayName}: ${result.errorMessage}`);
        });
    }
}
async function saveResultsToSupabase(results, supabaseService) {
    if (!supabaseService) {
        console.log('⚠️ Supabase 服務未初始化，跳過資料庫儲存');
        return;
    }
    console.log('\n💾 開始儲存結果到 Supabase 資料庫...');
    const savePromises = results.map(async (result) => {
        if (result.status === 'success' || result.status === 'partial_success') {
            try {
                const saveResult = await supabaseService.saveScraperResult(result);
                if (saveResult.success) {
                    if (saveResult.inserted) {
                        console.log(`✅ ${result.brand.displayName} 資料儲存成功`);
                    }
                    else {
                        console.log(`⚠️ ${result.brand.displayName} 資料已存在，跳過儲存`);
                    }
                }
                else {
                    console.error(`❌ ${result.brand.displayName} 資料儲存失敗: ${saveResult.error}`);
                }
                return saveResult;
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : '未知錯誤';
                console.error(`❌ ${result.brand.displayName} 儲存過程發生錯誤:`, error);
                return { success: false, error: errorMessage };
            }
        }
        else {
            console.log(`⚠️ ${result.brand.displayName} 狀態為 ${result.status}，跳過儲存`);
            return { success: true, skipped: true };
        }
    });
    const saveResults = await Promise.all(savePromises);
    const successfulSaves = saveResults.filter(r => r.success && r.inserted).length;
    const skippedSaves = saveResults.filter(r => r.success && !r.inserted).length;
    const failedSaves = saveResults.filter(r => !r.success).length;
    console.log(`\n📊 資料庫儲存總結:`);
    console.log(`✅ 成功插入: ${successfulSaves} 筆`);
    console.log(`⚠️ 跳過重複: ${skippedSaves} 筆`);
    console.log(`❌ 儲存失敗: ${failedSaves} 筆`);
}
function outputResultsForSupabase(results) {
    console.log('\n💾 Supabase 接入資料格式');
    console.log('========================');
    const successfulResults = results.filter(r => r.status !== 'failed');
    if (successfulResults.length === 0) {
        console.log('❌ 沒有成功處理的品牌資料');
        return;
    }
    const supabaseData = successfulResults.map(result => ({
        brand_name: result.brand.name,
        brand_display_name: result.brand.displayName,
        brand_category: result.brand.category,
        products_count: result.productsCount,
        products: result.products,
        scraped_at: result.scrapedAt.toISOString(),
        status: result.status,
        execution_time_ms: result.executionTime
    }));
    console.log(JSON.stringify(supabaseData, null, 2));
    console.log('\n📝 Supabase 表格建議結構:');
    console.log('CREATE TABLE product_scrapes (');
    console.log('  id SERIAL PRIMARY KEY,');
    console.log('  brand_name TEXT NOT NULL,');
    console.log('  brand_display_name TEXT NOT NULL,');
    console.log('  brand_category TEXT NOT NULL,');
    console.log('  products_count INTEGER NOT NULL,');
    console.log('  products JSONB NOT NULL,');
    console.log('  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,');
    console.log('  status TEXT NOT NULL,');
    console.log('  execution_time_ms INTEGER NOT NULL,');
    console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
    console.log(');');
    console.log('\n💡 插入範例:');
    console.log('// 此處對接 Supabase');
    console.log('// const { data, error } = await supabase');
    console.log('//   .from(\'product_scrapes\')');
    console.log('//   .insert(supabaseData);');
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
process.on('unhandledRejection', (error) => {
    console.error('💥 未處理的 Promise 拒絕:', error);
    process.exit(1);
});
process.on('uncaughtException', (error) => {
    console.error('💥 未捕獲的異常:', error);
    process.exit(1);
});
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        console.error('💥 程式執行失敗:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map