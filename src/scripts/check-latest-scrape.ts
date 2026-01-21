
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

    console.log('Querying crawler_runs table...');

    const { data, error } = await supabase
        .from('crawler_runs')
        .select('*')
        .eq('brand_name', '摩斯漢堡') // Note: crawler_runs uses displayName
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        // Try querying by ID or just list latest run of any brand
        console.log('Query by specific name failed, fetching latest of ANY brand...');
        const { data: anyData, error: anyError } = await supabase
            .from('crawler_runs')
            .select('*')
            .order('completed_at', { ascending: false })
            .limit(1)
            .single();

        if (anyData) {
            console.log('Latest Run (Any Brand):', anyData);
        } else {
            console.error('Error fetching any runs:', anyError);
        }
    } else {
        console.log('Latest Grid Run for Mos Burger:');
        console.log(`Time: ${data.completed_at}`);
        console.log(`Products Found: ${data.products_found}`);
        console.log(`Products New: ${data.products_new}`);
        console.log(`Status: ${data.status}`);
    }
}

main();
