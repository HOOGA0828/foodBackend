
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase env vars');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const brandName = '吉野家';
    const slug = '吉野家';

    console.log(`Checking if brand ${brandName} exists...`);
    const { data: existing, error: findError } = await supabase.from('brands').select('id').eq('slug', slug).maybeSingle();

    if (existing) {
        console.log(`Brand ${brandName} already exists with ID: ${existing.id}`);
        return;
    }

    console.log(`Inserting brand ${brandName}...`);
    const { data, error } = await supabase.from('brands').insert({
        name: brandName,
        name_jp: '吉野家',
        slug: slug,
        website: 'https://www.yoshinoya.com/',
        is_active: true
    }).select();

    if (error) {
        console.error('Error inserting brand:', error);
    } else {
        console.log('Successfully inserted brand:', data);
    }
}

main().catch(console.error);
