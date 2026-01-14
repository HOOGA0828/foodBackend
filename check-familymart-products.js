import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkFamilyMartProducts() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🔍 檢查 FamilyMart 產品資料...\n');

    // 1. 找到 FamilyMart 品牌 ID
    const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('id, name, name_zh')
        .eq('slug', 'familymart')
        .single();

    if (brandError || !brandData) {
        console.log('❌ 找不到 FamilyMart 品牌');
        return;
    }

    console.log(`✅ 品牌: ${brandData.name_zh} (${brandData.name})`);
    console.log(`   ID: ${brandData.id}\n`);

    // 2. 查詢該品牌的產品
    const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, name_jp, price, available_start_date, image_urls, source_url')
        .eq('brand_id', brandData.id)
        .order('created_at', { ascending: false });

    if (productsError) {
        console.error('❌ 查詢產品失敗:', productsError);
        return;
    }

    console.log(`📊 總共找到 ${products?.length || 0} 個產品\n`);

    if (products && products.length > 0) {
        console.log('📦 產品列表:');
        products.forEach((p, i) => {
            console.log(`\n${i + 1}. ${p.name_jp || p.name}`);
            console.log(`   中文: ${p.name}`);
            console.log(`   價格: ${p.price ? `¥${p.price}` : 'N/A'}`);
            console.log(`   發售日: ${p.available_start_date || 'N/A'}`);
            console.log(`   圖片: ${p.image_urls?.[0] ? '✅' : '❌'}`);
        });
    } else {
        console.log('⚠️ 沒有找到任何產品');
    }
}

checkFamilyMartProducts().catch(console.error);
