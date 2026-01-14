import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function listAllBrands() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('📋 列出所有品牌...\n');

    const { data: brands, error } = await supabase
        .from('brands')
        .select('*')
        .order('name');

    if (error) {
        console.error('❌ 查詢失敗:', error);
        return;
    }

    console.log(`找到 ${brands?.length || 0} 個品牌:\n`);
    brands?.forEach((b, i) => {
        console.log(`${i + 1}. ${JSON.stringify(b, null, 2)}\n`);
    });
}

listAllBrands().catch(console.error);
