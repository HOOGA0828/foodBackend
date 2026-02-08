import dotenv from 'dotenv';
import { createWebScraper } from './scraper/scraper.js';
import { AIParserService } from './services/aiParser.js';
import { getBrandByName } from './config/brands.js';

import { createSupabaseService } from './services/supabase.js';

// 載入環境變數
dotenv.config();

async function testStarbucksScraper() {
    console.log('🚀 開始測試 Starbucks 爬蟲...');

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        console.error('❌ 錯誤: 未設定 GEMINI_API_KEY 環境變數');
        process.exit(1);
    }

    try {
        // 1. 初始化服務
        const aiParser = new AIParserService(geminiApiKey);
        const scraper = createWebScraper(aiParser);
        const supabaseService = createSupabaseService();

        if (!supabaseService) {
            console.warn('⚠️警告: 無法初始化 Supabase 服務，將不會儲存資料');
        }

        // 2. 獲取 Starbucks 設定
        const brandConfig = getBrandByName('starbucks');
        if (!brandConfig) {
            console.error('❌ 錯誤: 找不到 Starbucks 設定');
            return;
        }

        console.log(`📋 測試品牌: ${brandConfig.displayName}`);
        console.log(`🔗 目標網址 1: ${brandConfig.url}`);
        if (brandConfig.url2) {
            console.log(`🔗 目標網址 2: ${brandConfig.url2}`);
        }

        // 3. 執行爬蟲
        console.log('🕷️ 執行爬蟲中...');
        const result = await scraper.scrapeAndParseBrand(brandConfig);

        // 4. 顯示結果
        console.log('\n==========================================');
        console.log(`✅ 爬取完成! 狀態: ${result.status}`);
        console.log(`⏱️ 耗時: ${result.executionTime}ms`);
        console.log(`📦 抓取產品數量: ${result.productsCount}`);

        if (result.status === 'failed') {
            console.error(`❌ 錯誤訊息: ${result.errorMessage}`);
        }

        console.log('==========================================\n');

        if (result.products && result.products.length > 0) {
            console.log('🔍 抓取到的產品清單 (前 5 筆):');
            result.products.slice(0, 5).forEach((p, index) => {
                console.log(`\n[${index + 1}] ${p.originalName} (${p.translatedName || '無翻譯'})`);
                console.log(`   💰 價格: ${p.price ? `¥${p.price.amount}` : '未抓取'}`);
                console.log(`   🔗 連結: ${p.sourceUrl}`);
                console.log(`   🖼️圖片: ${p.imageUrl}`);
            });

            if (result.products.length > 5) {
                console.log(`\n...還有 ${result.products.length - 5} 個產品`);
            }

            // 5. 儲存到資料庫
            if (supabaseService) {
                console.log('\n💾 正在儲存到資料庫...');
                const saveResult = await supabaseService.saveScraperResult(result);
                console.log('儲存結果:', saveResult);
            }

        } else {
            console.log('⚠️ 警告: 未抓取到任何產品');
        }

    } catch (error) {
        console.error('❌ 測試發生未預期的錯誤:', error);
    }
}

// 執行測試
testStarbucksScraper();
