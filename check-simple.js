import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkSimple() {
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Checking FamilyMart products...');

    // Get Brand ID
    const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('slug', 'familymart')
        .single();

    if (!brand) {
        console.log('Error: Brand not found');
        return;
    }

    // Get Products
    const { data: products } = await supabase
        .from('products')
        .select('name, price, source_url')
        .eq('brand_id', brand.id);

    console.log(`Total Products: ${products?.length || 0}`);

    if (products && products.length > 0) {
        console.log('Top 5 Items:');
        products.slice(0, 5).forEach((p, i) => {
            console.log(`${i + 1}. ${p.name} (${p.price} JPY)`);
            console.log(`   URL: ${p.source_url}`);
        });
    }
}

checkSimple().catch(console.error);
