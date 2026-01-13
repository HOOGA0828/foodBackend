
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("🚀 Testing Raw Supabase Insert with name_jp...");

    // 1. Get Brand ID
    const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', '7-eleven') // matching my clear script logic
        .single();

    if (!brand) {
        console.error("❌ 7-Eleven brand not found? slug might be '7-eleven'");
        // Try finding by name?
        const { data: brand2 } = await supabase
            .from('brands')
            .select('id')
            .eq('name', '7-Eleven')
            .single();
        if (!brand2) {
            console.error("❌ Brand truly not found.");
            return;
        }
        console.log("✅ Found brand by name:", brand2.id);
        brand.id = brand2.id;
    } else {
        console.log("✅ Found brand by slug:", brand.id);
    }

    const testProduct = {
        name: "Tested Product " + Date.now(),
        name_jp: "テスト商品 (Original Name)", // The field we check
        description: "Test Description",
        brand_id: brand.id,
        price: 999,
        currency: "JPY",
        image_urls: ["https://example.com/valid.jpg"],
        status: "available",
        source_url: "https://example.com/test-standalone-" + Date.now(),
        scraped_at: new Date().toISOString(),
        metadata: { original_name: "テスト商品 (Original Name)" }
    };

    const { data, error } = await supabase
        .from('products')
        .insert(testProduct)
        .select();

    if (error) {
        console.error("❌ Insert Failed:", error);
        if (error.message.includes('column "name_jp" does not exist')) {
            console.error("🚨 CONFIRMED: name_jp column is MISSING in DB!");
        }
    } else {
        console.log("✅ Insert Successful!", data);
    }
}

main().catch(console.error);
