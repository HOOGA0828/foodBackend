import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function setupFamilyMartBrand() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('🏪 設定 FamilyMart 品牌...\n');

    // 檢查是否已存在
    const { data: existing } = await supabase
        .from('brands')
        .select('*')
        .eq('slug', 'familymart')
        .single();

    if (existing) {
        console.log('✅ FamilyMart 品牌已存在');
        console.log(`   ID: ${existing.id}`);
        console.log(`   名稱: ${existing.name_zh} (${existing.name})`);
        return;
    }

    // 建立新品牌
    const { data, error } = await supabase
        .from('brands')
        .insert({
            name: 'FamilyMart',
            name_zh: '全家便利商店',
            slug: 'familymart',
            logo_url: 'https://www.family.co.jp/favicon.ico',
            website_url: 'https://www.family.co.jp',
            description: '日本全家便利商店',
            category: 'convenience_store',
            country: 'JP',
            is_active: true
        })
        .select()
        .single();

    if (error) {
        console.error('❌ 建立品牌失敗:', error);
        return;
    }

    console.log('✅ 成功建立 FamilyMart 品牌');
    console.log(`   ID: ${data.id}`);
    console.log(`   名稱: ${data.name_zh} (${data.name})`);
}

setupFamilyMartBrand().catch(console.error);
