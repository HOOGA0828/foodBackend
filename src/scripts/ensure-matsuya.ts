
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function ensureMatsuya() {
    console.log("🚀 Ensuring Matsuya Brand Exists...");

    const brand = {
        name: 'Matsuya',
        slug: 'matsuya', // Consistent slug
        name_en: 'Matsuya',
        name_jp: '松屋',
        displayName: 'Matsuya', // Adding displayName for consistency if needed by other scripts, though schema might not have it, let's stick to known fields
        category: 'restaurant',
        url: 'https://www.matsuyafoods.co.jp/matsuya/menu/'
    };

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

ensureMatsuya().catch(console.error);
