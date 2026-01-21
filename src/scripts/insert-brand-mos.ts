
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

async function main() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Inserting Mos Burger brand...');

    const { data, error } = await supabase
        .from('brands')
        .upsert({
            name: 'mos_burger',
            name_en: 'Mos Burger',
            name_jp: 'モスバーガー',
            slug: 'mos_burger',
            website: 'https://www.mos.jp/',
            description: '日本連鎖速食店',
            is_active: true
        }, { onConflict: 'name' })
        .select();

    if (error) {
        console.error('Error inserting brand:', error);
    } else {
        console.log('Success:', data);
    }
}

main();
