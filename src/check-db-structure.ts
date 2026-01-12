import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkDatabaseStructure() {
  console.log('🔍 檢查 Supabase 資料庫實際結構...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 環境變數未設定');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 直接測試常見的表格是否存在
    console.log('📋 檢查資料庫中的表格...\n');

    const tablesToCheck = [
      'brands',
      'categories',
      'products',
      'product_categories',
      'product_scrapes',
      'crawler_runs',
      'product_changes'
    ];

    console.log('🔍 測試以下表格是否存在:');
    for (const tableName of tablesToCheck) {
      try {
        // 嘗試查詢表格
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error && error.code === 'PGRST116') {
          // 表格不存在
          console.log(`  ❌ ${tableName} - 不存在`);
        } else {
          // 表格存在，檢查記錄數量
          const { count, error: countError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (countError) {
            console.log(`  ✅ ${tableName} - 存在 (無法統計記錄數)`);
          } else {
            console.log(`  ✅ ${tableName} - 存在 (${count || 0} 筆記錄)`);
          }
        }
      } catch (e) {
        console.log(`  ⚠️  ${tableName} - 檢查失敗`);
      }
    }
    console.log('');

    // 檢查 brands 表內容
    console.log('🏪 檢查 brands 表內容...');
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('*')
      .limit(5);

    if (brandsError) {
      console.error('❌ 查詢 brands 失敗:', brandsError);
    } else {
      console.log(`brands 表有 ${brands?.length || 0} 筆記錄:`);
      brands?.forEach((brand, index) => {
        console.log(`  ${index + 1}. ${brand.name} (slug: ${brand.slug}, category: ${brand.category}) - ${brand.is_active ? '啟用' : '停用'}`);
      });
    }
    console.log('');

    // 檢查 product_scrapes 表
    console.log('📦 檢查 product_scrapes 表（舊爬蟲儲存位置）...');
    const { data: scrapes, error: scrapesError } = await supabase
      .from('product_scrapes')
      .select('*')
      .limit(3);

    if (scrapesError) {
      console.error('❌ 查詢 product_scrapes 失敗:', scrapesError);
    } else {
      console.log(`product_scrapes 表中有 ${scrapes?.length || 0} 筆記錄`);
      if (scrapes && scrapes.length > 0) {
        console.log('爬取記錄:');
        scrapes.forEach((scrape, index) => {
          const scrapedAt = new Date(scrape.scraped_at).toLocaleString('zh-TW');
          console.log(`  ${index + 1}. ${scrape.brand_display_name} - ${scrape.products_count} 個產品 (${scrapedAt})`);
        });
      } else {
        console.log('  ⚠️  沒有找到任何爬取記錄');
      }
    }
    console.log('');

    // 檢查 crawler_runs 表
    console.log('📊 檢查 crawler_runs 表（爬蟲執行記錄）...');
    const { data: runs, error: runsError } = await supabase
      .from('crawler_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);

    if (runsError) {
      console.error('❌ 查詢 crawler_runs 失敗:', runsError);
    } else {
      console.log(`crawler_runs 表中有 ${runs?.length || 0} 筆記錄:`);
      runs?.forEach((run, index) => {
        const startedAt = new Date(run.started_at).toLocaleString('zh-TW');
        const status = run.status;
        console.log(`  ${index + 1}. ${run.brand_name} - ${status} (新增: ${run.products_new}, 更新: ${run.products_updated}) - ${startedAt}`);
      });
    }
    console.log('');

    // 檢查 products 表
    console.log('📦 檢查 products 表（新設計的產品表）...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('name, crawled_from, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    // 檢查按品牌分組的產品數量
    console.log('📊 按品牌統計產品數量...');
    const { data: brandStats, error: statsError } = await supabase
      .from('products')
      .select('crawled_from')
      .not('crawled_from', 'is', null);

    if (!statsError && brandStats) {
      const stats = brandStats.reduce((acc, product) => {
        const brand = product.crawled_from || 'unknown';
        acc[brand] = (acc[brand] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('各品牌產品數量:');
      Object.entries(stats).forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count} 個產品`);
      });
    }
    console.log('');

    if (productsError) {
      console.error('❌ 查詢 products 失敗:', productsError);
    } else {
      console.log(`products 表中有 ${products?.length || 0} 筆記錄`);
      if (products && products.length > 0) {
        console.log('產品記錄:');
        products.forEach((product, index) => {
          const updatedAt = new Date(product.updated_at).toLocaleString('zh-TW');
          console.log(`  ${index + 1}. ${product.name} (${updatedAt})`);
        });
      } else {
        console.log('  ⚠️  沒有找到任何產品記錄');
      }
    }
    console.log('');

    // 總結和診斷
    console.log('📊 診斷結果:');
    console.log(`  ✅ brands 表: ${brands?.length || 0} 筆記錄`);
    console.log(`  ✅ categories 表: 存在`);
    console.log(`  ⚠️  product_scrapes 表: ${scrapes?.length || 0} 筆記錄 (舊系統)`);
    console.log(`  ⚠️  products 表: ${products?.length || 0} 筆記錄 (新系統)`);

    if ((scrapes?.length || 0) === 0 && (products?.length || 0) === 0) {
      console.log('\n🔍 問題分析:');
      console.log('  1. 爬蟲程式可能沒有成功執行');
      console.log('  2. 或爬蟲執行時發生錯誤');
      console.log('  3. 或環境變數設定不正確');
      console.log('  4. 或爬蟲程式正在使用舊的資料儲存邏輯');
      console.log('\n💡 建議檢查:');
      console.log('  1. 檢查 .env 檔案中的 OpenAI API Key');
      console.log('  2. 檢查 Supabase 連線設定');
      console.log('  3. 嘗試手動執行爬蟲: npm run scraper:run');
      console.log('  4. 檢查爬蟲執行時的錯誤訊息');
    }

  } catch (error) {
    console.error('❌ 檢查失敗:', error);
  }
}

checkDatabaseStructure().catch(console.error);