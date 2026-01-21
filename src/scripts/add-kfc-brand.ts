import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function addKfcBrand() {
    console.log('🚀 Adding KFC brand to database...');

    const kfcBrand = {
        name: 'KFC',
        name_en: 'KFC',
        name_jp: 'ケンタッキー',
        slug: 'kfc',
        website: 'https://www.kfc.co.jp/menu/',
        category: 'fast_food',
        is_active: true
    };

    try {
        // Check if exists
        const { data: existing } = await supabase
            .from('brands')
            .select('id')
            .eq('slug', 'kfc')
            .maybeSingle();

        if (existing) {
            console.log('⚠️ KFC brand already exists (ID:', existing.id, '). Updating...');
            const { error: updateError } = await supabase
                .from('brands')
                .update(kfcBrand)
                .eq('id', existing.id);

            if (updateError) console.error('Update failed:', updateError);
            else console.log('✅ Update success.');

        } else {
            const { error: insertError } = await supabase
                .from('brands')
                .insert(kfcBrand);

            if (insertError) {
                console.error('Insert failed:', insertError);
            } else {
                console.log('✅ Successfully added KFC brand.');
            }
        }
    } catch (error) {
        console.error('❌ Error adding KFC brand:', error);
    }
}

addKfcBrand();
