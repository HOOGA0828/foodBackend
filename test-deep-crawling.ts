// 簡單測試二層抓取功能
// 注意：這是一個臨時測試檔案，實際使用請設定 OPENAI_API_KEY

import 'dotenv/config';
import { createAIParserService } from './src/services/aiParser.ts';
import { createWebScraper } from './src/scraper/scraper.ts';
import { createSupabaseService } from './src/services/supabase.ts';
import { BRANDS } from './src/config/brands.ts';
import { getTestConfigs } from './test-urls-config.ts';

async function testDeepCrawling() {
  console.log('🧪 測試二層抓取功能');

  try {
    // 檢查環境變數
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ 請設定 OPENAI_API_KEY 環境變數');
      process.exit(1);
    }

    // 初始化服務
    const aiParser = createAIParserService();
    const scraper = createWebScraper(aiParser);
    const supabaseService = createSupabaseService();

    // 優先使用測試配置，如果沒有則使用品牌配置
    let testBrand;
    const testConfigs = getTestConfigs();

    if (testConfigs.length > 0) {
      // 使用測試配置
      testBrand = testConfigs[0]; // 使用第一個測試配置
      console.log('📋 使用測試配置檔案');
    } else {
      // 使用品牌配置
      testBrand = BRANDS.find(b => b.enabled);
      console.log('📋 使用品牌配置');
    }

    if (!testBrand) {
      console.error('❌ 沒有找到可用的配置');
      process.exit(1);
    }

    console.log(`🏪 測試目標: ${testBrand.displayName}`);
    console.log(`🔗 目標網址: ${testBrand.url}`);
    console.log(`🔍 二層抓取: ${testBrand.options?.deepCrawling?.enabled ? '啟用' : '停用'}`);

    // 執行抓取
    const result = await scraper.scrapeAndParseBrand(testBrand);

    // 儲存到資料庫
    if (supabaseService) {
      console.log('\n💾 儲存測試結果到 Supabase...');
      const saveResult = await supabaseService.saveScraperResult(result);
      if (saveResult.success) {
        if (saveResult.inserted) {
          console.log('✅ 測試資料儲存成功');
        } else {
          console.log('⚠️ 測試資料已存在（去重機制生效）');
        }
      } else {
        console.error('❌ 測試資料儲存失敗:', saveResult.error);
      }
    }

    // 顯示結果
    console.log('\n📊 測試結果:');
    console.log(`✅ 狀態: ${result.status}`);
    console.log(`📦 產品數量: ${result.productsCount}`);
    console.log(`⏱️ 執行時間: ${result.executionTime}ms`);

    if (result.products.length > 0) {
      console.log('\n🛍️ AI 解析結果預覽:');
      result.products.slice(0, 3).forEach((product, index) => {
        console.log(`${index + 1}. ${product.translatedName}`);
        console.log(`   日文原名: ${product.originalName}`);
        if (product.translatedDescription) {
          console.log(`   描述: ${product.translatedDescription.substring(0, 50)}...`);
        }
        if (product.price) {
          console.log(`   價格: ${product.price.amount} ${product.price.currency}`);
        }
        console.log(`   來源: ${product.sourceUrl}`);
        console.log('');
      });

      // 顯示完整的 JSON 輸出
      console.log('\n📄 完整的 AI 解析 JSON 輸出:');
      console.log('=' .repeat(50));
      console.log(JSON.stringify(result.products, null, 2));
      console.log('=' .repeat(50));
    } else {
      console.log('\n⚠️ AI 解析沒有找到任何產品');
      console.log('💡 可能原因：');
      console.log('   1. 選擇器沒有找到產品連結');
      console.log('   2. 頁面內容不包含產品資訊');
      console.log('   3. AI 解析邏輯需要調整');
    }

    if (result.errorMessage) {
      console.log(`❌ 錯誤訊息: ${result.errorMessage}`);
    }

    // 顯示統計資訊
    console.log('\n📊 處理統計:');
    console.log(`🏪 品牌: ${result.brand.displayName}`);
    console.log(`📂 分類: ${result.brand.category}`);
    console.log(`📦 產品數量: ${result.productsCount}`);
    console.log(`⏱️ 執行時間: ${result.executionTime}ms`);
    console.log(`📅 爬取時間: ${result.scrapedAt.toLocaleString('zh-TW')}`);

    // 顯示 Supabase 格式的數據
    console.log('\n💾 Supabase 插入格式:');
    console.log('=' .repeat(50));
    const supabaseData = {
      brand_name: result.brand.name,
      brand_display_name: result.brand.displayName,
      brand_category: result.brand.category,
      products_count: result.productsCount,
      products: result.products,
      scraped_at: result.scrapedAt.toISOString(),
      status: result.status,
      execution_time_ms: result.executionTime
    };
    console.log(JSON.stringify(supabaseData, null, 2));
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('💥 測試失敗:', error);
  }
}

// 執行測試
testDeepCrawling();