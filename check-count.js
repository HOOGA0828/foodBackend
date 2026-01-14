import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function checkCount() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: brand } = await supabase.from('brands').select('id').eq('slug', 'familymart').single();
    if (!brand) return console.log('Brand not found');
    const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('brand_id', brand.id);
    console.log(`COUNT:${count}`);
}
checkCount().catch(console.error);
