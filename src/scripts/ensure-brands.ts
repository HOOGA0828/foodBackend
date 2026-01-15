
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureBrands() {
    console.log("🚀 Ensuring Brands Exist...");

    const brands = [
        {
            name: '吉野家',
            slug: 'yoshinoya',
            name_en: 'Yoshinoya',
            name_jp: '吉野家',
            category: 'restaurant',
            url: 'https://www.yoshinoya.com/'
        },
        {
            name: 'Sukiya',
            slug: 'sukiya',
            name_en: 'Sukiya',
            name_jp: 'すき家',
            category: 'restaurant',
            url: 'https://www.sukiya.jp/'
        }
    ];

    for (const brand of brands) {
        // Check if exists
        const { data } = await supabase
            .from('brands')
            .select('id, name')
            .eq('slug', brand.slug)
            .single();

        if (data) {
            console.log(`✅ Brand already exists: ${brand.name} (${data.id})`);
        } else {
            console.log(`➕ Creating brand: ${brand.name}...`);
            const { error } = await supabase
                .from('brands')
                .insert({
                    name: brand.name,
                    slug: brand.slug,
                    name_en: brand.name_en,
                    name_jp: brand.name_jp,
                    website: brand.url,
                    is_active: true
                });

            if (error) {
                console.error(`❌ Failed to create ${brand.name}:`, error);
            } else {
                console.log(`✅ Created ${brand.name}`);
            }
        }
    }
}

ensureBrands().catch(console.error);
