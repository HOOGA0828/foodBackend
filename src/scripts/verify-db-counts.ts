
import 'dotenv/config';
import { createSupabaseService } from '../services/supabase.js';

async function main() {
    const args = process.argv.slice(2);
    const brandName = args[0] || '7-Eleven';

    console.log(`🔍 檢查 ${brandName} 的資料庫狀態...`);

    const supabaseService = createSupabaseService();
    if (!supabaseService) {
        console.error('❌ 無法初始化 Supabase');
        process.exit(1);
    }

    // @ts-ignore - access private supabase client for quick check
    const supabase = supabaseService['supabase'];

    // Get brand ID first
    const { data: brand } = await supabase.from('brands').select('id').eq('slug', brandName.toLowerCase().replace(/\s+/g, '-')).single();
    if (!brand) {
        console.error("Brand not found");
        return;
    }

    const { count, data: products } = await supabase
        .from('products')
        .select('name, image_urls, source_url', { count: 'exact' })
        .eq('brand_id', brand.id);

    console.log(`📊 產品總數: ${count}`);

    if (products && products.length > 0) {
        const validImages = products.filter((p: any) => {
            if (!p.image_urls || p.image_urls.length === 0) return false;
            const url = p.image_urls[0];
            return /\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url);
        });

        console.log(`🖼️ 有效圖片數: ${validImages.length} / ${products.length}`);

        if (validImages.length < products.length) {
            console.log("⚠️ 發現無效圖片連結範例:");
            const invalid = products.filter((p: any) => !p.image_urls || p.image_urls.length === 0 || !/\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(p.image_urls[0]));
            invalid.slice(0, 3).forEach((p: any) => {
                console.log(`   - ${p.name}: ${p.image_urls ? p.image_urls[0] : '無圖片'}`);
            });
        } else {
            console.log("✅ 所有產品圖片連結格式正確。");
        }
    }
}

main().catch(console.error);
